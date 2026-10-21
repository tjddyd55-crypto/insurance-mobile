import type { AuthUser } from '../../api/authApi';
import {
  addDaysYmd,
  eventDayRange,
  eventTimeLabel,
  eventsOnDay,
  monthRange,
  scheduleGoogleWarning,
  seoulYmd,
  shiftMonth,
  tasksOnDay,
} from '../schedule/scheduleModel';
import type { ScheduleEventsResult } from '../schedule/types';
import { sortTodosByRecentWrite } from '../todos/todoModel';
import type { TodoRecord } from '../todos/types';
import {
  WIDGET_SCHEDULE_TIME_ZONE,
  WIDGET_SNAPSHOT_VERSION,
  type WidgetScheduleDay,
  type WidgetSnapshot,
  type WidgetTodoDay,
} from './widgetContract';
import { widgetScheduleLink, widgetTodoEditLink } from './widgetLinks';

export const WIDGET_TITLE_MAX = 80;

/** 계정 격리 키. 사용자 id + GA(조직) — 같은 기기에서 계정을 바꾸면 달라진다. */
export function widgetAccountKey(user: Pick<AuthUser, 'id' | 'gaId'>): string {
  return `u:${user.id}|ga:${user.gaId ?? 0}`;
}

/**
 * 위젯이 보여 줄 기간: 이번 달 기준 이전 1개월 ~ 다음 2개월(한 번의 /api/schedule/events 요청, 서버 400일 제한 이내).
 * 위젯에서 이 범위 밖으로 넘기면 "앱에서 보기"로 안내한다(탭마다 서버 요청하지 않는다).
 */
export function widgetWindow(today: string): { from: string; to: string } {
  const thisMonth = `${today.slice(0, 7)}-01`;
  return { from: shiftMonth(thisMonth, -1), to: monthRange(shiftMonth(thisMonth, 2)).to };
}

function clip(title: string): string {
  const oneLine = title.replace(/\s+/g, ' ').trim();
  return oneLine.length > WIDGET_TITLE_MAX ? `${oneLine.slice(0, WIDGET_TITLE_MAX - 1)}…` : oneLine || '(제목 없음)';
}

/** 위젯 하단의 작은 Google 안내. 연결 자체를 안 한 사용자에게는 띄우지 않는다(ONE FC 데이터는 계속 표시). */
export function widgetGoogleNotice(google: ScheduleEventsResult['google']): string | null {
  const warning = scheduleGoogleWarning(google);
  if (!warning) return null;
  if (!google.connected && google.status !== 'needs_reauth') return null;
  return 'Google 일정 동기화 필요';
}

/**
 * 일정 위젯 날짜별 목록. 앱 일정 화면과 같은 선택자(eventsOnDay → tasksOnDay)·같은 순서.
 * 날짜 없는 할 일(ONE FC·Google)은 tasksOnDay 가 dueDate 일치만 고르므로 들어가지 않는다.
 */
export function buildScheduleDays(result: Pick<ScheduleEventsResult, 'events' | 'tasks'>, scheme: string, from: string, to: string): WidgetScheduleDay[] {
  const dates = new Set<string>();
  for (const event of result.events) {
    const range = eventDayRange(event);
    for (let day = range.first < from ? from : range.first, guard = 0; day <= range.last && day <= to && guard < 400; day = addDaysYmd(day, 1), guard += 1) dates.add(day);
  }
  for (const task of result.tasks) if (task.dueDate && task.dueDate >= from && task.dueDate <= to) dates.add(task.dueDate);
  return [...dates].sort().flatMap((date) => {
    const items = [
      ...eventsOnDay(result.events, date).map((event) => ({
        id: event.id,
        title: clip(event.title),
        time: eventTimeLabel(event).startsWith('종일') ? '종일' : eventTimeLabel(event),
        kind: 'event' as const,
        done: false,
        link: widgetScheduleLink(scheme, date, { event: event.id }),
      })),
      ...tasksOnDay(result.tasks, date).map((task) => ({
        id: task.id,
        title: clip(task.title),
        time: task.dueTime ?? '',
        kind: task.source,
        done: task.status === 'completed',
        link:
          task.source === 'onefc_todo' && /^\d+$/.test(task.sourceId)
            ? widgetTodoEditLink(scheme, task.sourceId)
            : widgetScheduleLink(scheme, date, { event: task.id }),
      })),
    ];
    return items.length ? [{ date, items }] : [];
  });
}

/**
 * 할 일 위젯 날짜별 목록. 앱 할 일 화면과 같은 데이터(GET /api/todos, ONE FC 할 일만 — 앱 할 일 화면에 Google Tasks 없음)와
 * 같은 정렬(sortTodosByRecentWrite). 취소된 할 일·날짜 없는 할 일은 제외.
 */
export function buildTodoDays(todos: readonly TodoRecord[], scheme: string, from: string, to: string): WidgetTodoDay[] {
  const byDate = new Map<string, TodoRecord[]>();
  for (const todo of todos) {
    const due = todo.dueDate?.slice(0, 10) ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < from || due > to || todo.status === 'canceled') continue;
    byDate.set(due, [...(byDate.get(due) ?? []), todo]);
  }
  return [...byDate.keys()].sort().map((date) => ({
    date,
    items: sortTodosByRecentWrite(byDate.get(date) ?? []).map((todo) => ({
      id: todo.id,
      title: clip(todo.title || todo.description.split(/\r?\n/)[0] || ''),
      completed: todo.status === 'completed',
      link: widgetTodoEditLink(scheme, todo.id),
    })),
  }));
}

export type WidgetSnapshotInput = {
  user: Pick<AuthUser, 'id' | 'gaId'>;
  scheme: string;
  now?: Date;
  schedule: ScheduleEventsResult | null;
  todos: readonly TodoRecord[] | null;
  /** 이번 갱신에서 실패한 부분은 이전 스냅샷 값을 유지한다(같은 계정일 때만). */
  previous?: WidgetSnapshot | null;
};

export function buildWidgetSnapshot(input: WidgetSnapshotInput): WidgetSnapshot {
  const now = input.now ?? new Date();
  const today = seoulYmd(now);
  const window = widgetWindow(today);
  const accountKey = widgetAccountKey(input.user);
  const previous = input.previous && input.previous.accountKey === accountKey && input.previous.version === WIDGET_SNAPSHOT_VERSION ? input.previous : null;
  return {
    version: WIDGET_SNAPSHOT_VERSION,
    accountKey,
    scheme: input.scheme,
    timeZone: WIDGET_SCHEDULE_TIME_ZONE,
    lastUpdatedAt: now.toISOString(),
    schedule: input.schedule
      ? {
          ...window,
          days: buildScheduleDays(input.schedule, input.scheme, window.from, window.to),
          googleNotice: widgetGoogleNotice(input.schedule.google),
          ok: true,
        }
      : previous
        ? { ...previous.schedule, ok: false }
        : { ...window, days: [], googleNotice: null, ok: false },
    todos: input.todos
      ? { ...window, days: buildTodoDays(input.todos, input.scheme, window.from, window.to), ok: true }
      : previous
        ? { ...previous.todos, ok: false }
        : { ...window, days: [], ok: false },
  };
}
