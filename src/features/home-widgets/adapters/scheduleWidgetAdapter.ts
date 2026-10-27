import { ApiError } from '../../../api/client';
import { fetchScheduleEvents } from '../../schedule/scheduleApi';
import { addDaysYmd, countItemsByDay, eventDayRange, eventTimeLabel, eventsOnDay, scheduleGoogleWarning, tasksOnDay } from '../../schedule/scheduleModel';
import { applyScheduleViewPrefs, fetchScheduleViewPrefs, type ScheduleViewPrefs } from '../../schedule/scheduleViewPrefs';
import type { ScheduleEvent, ScheduleEventsResult } from '../../schedule/types';
import { buildWidgetDeepLink } from '../engine/widgetDeepLink';
import { clipWidgetTitle, type WidgetAdapter } from './adapterTypes';
import { widgetWindow } from './widgetWindow';

export type WidgetScheduleItem = {
  id: string;
  title: string;
  /** '종일' | 'HH:mm' | 'HH:mm ~ HH:mm' | '' */
  time: string;
  kind: 'event' | 'onefc_todo' | 'google_task';
  done: boolean;
  link: string;
};

export type WidgetScheduleDay = { date: string; items: WidgetScheduleItem[] };

/** 일정 위젯 payload(v1). */
export type ScheduleWidgetPayload = {
  visibleRange: { from: string; to: string };
  /** 새 위젯 인스턴스의 기본 선택 날짜(오늘). 인스턴스별 선택은 native 상태. */
  selectedDate: string;
  /** 항목이 있는 날짜(v1 호환). */
  calendarDays: string[];
  /** 날짜별 항목 수. 앱·웹 달력 배지와 같은 규칙(countItemsByDay). 칸 제목 + "+N" 합계 = 이 값. */
  calendarCounts: Record<string, number>;
  events: WidgetScheduleDay[];
  googleNotice: string | null;
};

/** 연결 자체를 안 한 사용자에게는 띄우지 않는다(ONE FC 데이터는 계속 표시). */
export function widgetGoogleNotice(google: ScheduleEventsResult['google']): string | null {
  if (!scheduleGoogleWarning(google)) return null;
  if (!google.connected && google.status !== 'needs_reauth') return null;
  return 'Google 일정 동기화 필요';
}

/** 앱 일정 화면 선택자(eventsOnDay → tasksOnDay) 그대로. 날짜 없는 할 일은 tasksOnDay 가 고르지 않는다. */
export function buildScheduleDays(result: Pick<ScheduleEventsResult, 'events' | 'tasks'>, scheme: string, from: string, to: string): WidgetScheduleDay[] {
  const dates = new Set<string>();
  // 날짜별 일정을 한 번에 모은다(날짜마다 전체 일정을 다시 훑으며 범위를 계산하던 O(날짜×일정) 제거). 원래 순서 유지 → eventsOnDay 와 같은 결과.
  const eventsByDay = new Map<string, ScheduleEvent[]>();
  for (const event of result.events) {
    const range = eventDayRange(event);
    for (let day = range.first < from ? from : range.first, guard = 0; day <= range.last && day <= to && guard < 400; day = addDaysYmd(day, 1), guard += 1) {
      dates.add(day);
      const list = eventsByDay.get(day);
      if (list) list.push(event);
      else eventsByDay.set(day, [event]);
    }
  }
  for (const task of result.tasks) if (task.dueDate && task.dueDate >= from && task.dueDate <= to) dates.add(task.dueDate);
  const link = (action: 'open' | 'edit', params: Record<string, string>) =>
    (action === 'edit' ? buildWidgetDeepLink(scheme, 'todo', 'edit', params) : buildWidgetDeepLink(scheme, 'schedule', 'open', params)) ?? '';
  return [...dates].sort().flatMap((date) => {
    const items: WidgetScheduleItem[] = [
      ...eventsOnDay(eventsByDay.get(date) ?? [], date).map((event) => {
        const time = eventTimeLabel(event);
        return { id: event.id, title: clipWidgetTitle(event.title), time: time.startsWith('종일') ? '종일' : time, kind: 'event' as const, done: false, link: link('open', { date, event: event.id }) };
      }),
      ...tasksOnDay(result.tasks, date).map((task) => ({
        id: task.id,
        title: clipWidgetTitle(task.title),
        time: task.dueTime ?? '',
        kind: task.source,
        done: task.status === 'completed',
        link: task.source === 'onefc_todo' && /^\d+$/.test(task.sourceId) ? link('edit', { id: task.sourceId }) : link('open', { date, event: task.id }),
      })),
    ];
    return items.length ? [{ date, items }] : [];
  });
}

/** prefs = PC/웹 일정 보기 설정(SSOT). null(없음·실패) → 전부 표시. 칸 목록과 배지 수가 같은 걸러진 결과를 쓴다. */
export function scheduleWidgetPayload(raw: ScheduleEventsResult, scheme: string, today: string, prefs: ScheduleViewPrefs | null = null): ScheduleWidgetPayload {
  const result = applyScheduleViewPrefs(raw, prefs);
  const range = widgetWindow(today);
  const events = buildScheduleDays(result, scheme, range.from, range.to);
  const calendarCounts: Record<string, number> = {};
  for (const [day, count] of countItemsByDay(result)) if (day >= range.from && day <= range.to) calendarCounts[day] = count;
  return { visibleRange: range, selectedDate: today, calendarDays: events.map((day) => day.date), calendarCounts, events, googleNotice: widgetGoogleNotice(result.google) };
}

/** 수동 새로고침만 refresh=1. 서버 간격 제한(429)이면 일반 조회. */
export const scheduleWidgetAdapter: WidgetAdapter<ScheduleWidgetPayload> = {
  async load({ token, scheme, today, reason }) {
    const range = widgetWindow(today);
    // 설정은 일정과 병렬로 매 갱신(수동·포그라운드·동기화)마다 최신을 읽는다. 실패해도 위젯은 오류가 아니다.
    const prefsPromise = fetchScheduleViewPrefs(token);
    let result: ScheduleEventsResult;
    if (reason === 'manual') {
      try {
        result = await fetchScheduleEvents(token, { ...range, refresh: true });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 429)) throw error;
        result = await fetchScheduleEvents(token, range);
      }
    } else {
      result = await fetchScheduleEvents(token, range);
    }
    return scheduleWidgetPayload(result, scheme, today, await prefsPromise);
  },
};
