import { ApiError } from '../../api/client';
import { readAuthSession } from '../../auth/secureStorage';
import { createScheduleEventWithResult, fetchWriteTargets } from '../schedule/scheduleApi';
import { emptyEventForm } from '../schedule/scheduleModel';
import { widgetBridge } from './widgetBridge';
import { refreshWidgets } from './engine/widgetRefreshCoordinator';

/**
 * 위젯 날짜 모달 빠른 추가(Google Calendar 식). native ScheduleDayActivity 가 headless 로 부른다.
 * 저장은 앱의 기존 서버 API(POST /api/service-integrations/google/write/events)와 기존 세션만 쓴다.
 * native 는 토큰을 보지 않고 Google 을 직접 부르지 않는다. 제목은 로그에 남기지 않는다.
 */
export const WIDGET_QUICK_ADD_TASK = 'OneFcWidgetQuickAdd' as const;
export const QUICK_ADD_TITLE_MAX = 200;

export type QuickAddPayload = { requestId?: unknown; date?: unknown; title?: unknown };
export type QuickAddResult =
  | { ok: true; requestId: string; eventId: string; date: string; title: string; refreshed: boolean }
  | { ok: false; requestId: string; code: 'login' | 'invalid' | 'no_calendar' | 'server' | 'network'; message: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID = /^[0-9a-f]{32}$/;

export function validateQuickAdd(data: QuickAddPayload | null | undefined): { requestId: string; date: string; title: string } | null {
  const requestId = typeof data?.requestId === 'string' ? data.requestId : '';
  const date = typeof data?.date === 'string' ? data.date : '';
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  if (!REQUEST_ID.test(requestId) || !YMD.test(date) || !title || title.length > QUICK_ADD_TITLE_MAX) return null;
  return { requestId, date, title };
}

function failure(requestId: string, error: unknown): QuickAddResult {
  if (error instanceof ApiError) {
    if (error.status === 401) return { ok: false, requestId, code: 'login', message: '로그인이 필요합니다' };
    if (error.status >= 400 && error.status < 500 && error.message) return { ok: false, requestId, code: 'server', message: error.message };
    return { ok: false, requestId, code: 'server', message: '저장하지 못했어요. 다시 시도해 주세요' };
  }
  return { ok: false, requestId, code: 'network', message: '연결이 불안정해요. 다시 시도해 주세요' };
}

/** 하루 종일 일정 1건 생성 → 일정 위젯 강제 갱신 → 결과를 native 로. 같은 requestId 재시도는 서버가 한 건으로 묶는다. */
export async function runWidgetQuickAdd(data: QuickAddPayload | null | undefined): Promise<QuickAddResult> {
  const requestId = typeof data?.requestId === 'string' ? data.requestId : '';
  const input = validateQuickAdd(data);
  let result: QuickAddResult;
  if (!input) {
    result = { ok: false, requestId, code: 'invalid', message: '제목을 입력해 주세요' };
  } else {
    result = await save(input);
  }
  await widgetBridge.reportQuickAddResult(result.requestId, JSON.stringify(result));
  return result;
}

async function save(input: { requestId: string; date: string; title: string }): Promise<QuickAddResult> {
  const { requestId, date, title } = input;
  try {
    const session = await readAuthSession();
    if (!session) return { ok: false, requestId, code: 'login', message: '로그인이 필요합니다' };
    const targets = await fetchWriteTargets(session.token);
    const calendar = targets.calendars.find((item) => item.primary) ?? targets.calendars[0];
    if (!calendar) return { ok: false, requestId, code: 'no_calendar', message: '저장할 Google 캘린더가 없어요. 앱에서 연결해 주세요' };
    const form = { ...emptyEventForm(date, calendar.id), title, allDay: true };
    const eventId = await createScheduleEventWithResult(session.token, form, requestId);
    let refreshed = false;
    try {
      const outcome = await refreshWidgets({ token: session.token, user: session.user }, { reason: 'appMutation', widgetTypes: ['schedule'], force: true });
      refreshed = outcome.schedule === 'written';
    } catch {
      refreshed = false;
    }
    return { ok: true, requestId, eventId, date, title, refreshed };
  } catch (error) {
    return failure(requestId, error);
  }
}
