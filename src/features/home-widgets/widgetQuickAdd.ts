import { ApiError } from '../../api/client';
import { readAuthSession } from '../../auth/secureStorage';
import { createOnefcSchedule } from '../schedule/scheduleApi';
import { emptyEventForm, setScheduleTimeSpecified } from '../schedule/scheduleModel';
import { createTodo } from '../todos/todosApi';
import { buildTodoCreatePayload, EMPTY_TODO_FORM_DRAFT } from '../todos/todoFormSession';
import { widgetBridge } from './widgetBridge';
import { refreshWidgets } from './engine/widgetRefreshCoordinator';

/**
 * 위젯 날짜 모달 빠른 추가. native ScheduleDayActivity 가 headless 로 부른다.
 * 일정은 POST /api/schedules (ONE FC). 앱이 이미 가진 로그인 세션만 쓴다. 위젯 전용 토큰은 없다.
 * native 는 토큰을 보지 않고 서버를 직접 부르지 않는다. 제목은 로그에 남기지 않는다.
 */
export const WIDGET_QUICK_ADD_TASK = 'OneFcWidgetQuickAdd' as const;
export const QUICK_ADD_TITLE_MAX = 200;

/**
 * kind: 'event'(기본, 기존 호출과 호환) | 'todo'. 일정은 allDay(기본 true) 또는 startTime/endTime(HH:mm).
 * 할 일은 내용·날짜만(dueTime 은 buildTodoCreatePayload 규칙으로 null).
 */
export type QuickAddPayload = { requestId?: unknown; date?: unknown; title?: unknown; kind?: unknown; allDay?: unknown; startTime?: unknown; endTime?: unknown };
export type QuickAddInput = { requestId: string; date: string; title: string; kind: 'event' | 'todo'; allDay: boolean; startTime: string; endTime: string };
export type QuickAddResult =
  | { ok: true; requestId: string; eventId: string; date: string; title: string; refreshed: boolean }
  | { ok: false; requestId: string; code: 'login' | 'invalid' | 'server' | 'network'; message: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID = /^[0-9a-f]{32}$/;

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateQuickAdd(data: QuickAddPayload | null | undefined): QuickAddInput | null {
  const requestId = typeof data?.requestId === 'string' ? data.requestId : '';
  const date = typeof data?.date === 'string' ? data.date : '';
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  if (!REQUEST_ID.test(requestId) || !YMD.test(date) || !title || title.length > QUICK_ADD_TITLE_MAX) return null;
  const kind = data?.kind === 'todo' ? 'todo' : 'event';
  // native 는 Bundle 문자열로 보낸다: "false" 만 시간 지정.
  const allDay = kind === 'todo' ? true : !(data?.allDay === false || data?.allDay === 'false');
  const startTime = typeof data?.startTime === 'string' ? data.startTime : '';
  const endTime = typeof data?.endTime === 'string' ? data.endTime : '';
  if (!allDay && !HM.test(startTime)) return null;
  return { requestId, date, title, kind, allDay, startTime, endTime };
}

function failure(requestId: string, error: unknown): QuickAddResult {
  if (error instanceof ApiError) {
    if (error.status === 401) return { ok: false, requestId, code: 'login', message: '로그인이 필요합니다' };
    if (error.status >= 400 && error.status < 500 && error.message) return { ok: false, requestId, code: 'server', message: error.message };
    return { ok: false, requestId, code: 'server', message: '저장하지 못했어요. 다시 시도해 주세요' };
  }
  return { ok: false, requestId, code: 'network', message: '연결이 불안정해요. 다시 시도해 주세요' };
}

/** 하루 종일 ONE FC 일정 1건 → 일정 위젯 강제 갱신 → 결과를 native 로. 같은 requestId 재시도는 서버가 한 건으로 묶는다. */
export async function runWidgetQuickAdd(data: QuickAddPayload | null | undefined): Promise<QuickAddResult> {
  const requestId = typeof data?.requestId === 'string' ? data.requestId : '';
  const input = validateQuickAdd(data);
  let result: QuickAddResult;
  if (!input) {
    result = { ok: false, requestId, code: 'invalid', message: data?.kind === 'todo' ? '내용을 입력해 주세요' : '제목을 입력해 주세요' };
  } else {
    result = await save(input);
  }
  await widgetBridge.reportQuickAddResult(result.requestId, JSON.stringify(result));
  return result;
}

async function save(input: QuickAddInput): Promise<QuickAddResult> {
  const { requestId, date, title, kind } = input;
  try {
    const session = await readAuthSession();
    if (!session) return { ok: false, requestId, code: 'login', message: '로그인이 필요합니다' };
    let eventId: string;
    if (kind === 'todo') {
      // 앱 할 일 추가와 같은 본문 규칙(새 할 일 dueTime null).
      const todo = await createTodo(session.token, buildTodoCreatePayload({ ...EMPTY_TODO_FORM_DRAFT, description: title, dueDate: date }));
      eventId = String(todo.id);
    } else {
      const base = { ...emptyEventForm(date), title };
      const clock = input.allDay ? { allDay: true } : setScheduleTimeSpecified({ allDay: false, startTime: input.startTime, endTime: input.endTime }, true);
      eventId = await createOnefcSchedule(session.token, { ...base, ...clock }, requestId);
    }
    let refreshed = false;
    try {
      const widgetType = kind === 'todo' ? 'todo' : 'schedule';
      // 일정 위젯 날짜 목록에도 할 일이 보이므로 할 일은 두 위젯 모두 갱신.
      const outcome = await refreshWidgets({ token: session.token, user: session.user }, { reason: 'appMutation', widgetTypes: kind === 'todo' ? ['todo', 'schedule'] : ['schedule'], force: true });
      refreshed = outcome[widgetType] === 'written';
    } catch {
      refreshed = false;
    }
    return { ok: true, requestId, eventId, date, title, refreshed };
  } catch (error) {
    return failure(requestId, error);
  }
}
