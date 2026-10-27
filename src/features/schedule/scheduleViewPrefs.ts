/**
 * 일정 보기 설정 — PC/웹이 저장한 GET /api/me/schedule-view-prefs 를 그대로 읽는다(SSOT).
 * 앱/위젯에 별도 설정·하드코딩 없음. 실패·빈 값은 null → 호출부가 "전부 표시"(기존 기본)로 둔다.
 */
import { apiRequest } from '../../api/client';
import type { ScheduleEvent, ScheduleEventsResult, ScheduleTask } from './types';

export type ScheduleFilterKey = 'google' | 'google_task' | 'onefc_todo' | 'customer_alert' | 'car_expiry' | 'insurance_age';
export const SCHEDULE_FILTER_KEYS: readonly ScheduleFilterKey[] = ['google', 'google_task', 'onefc_todo', 'customer_alert', 'car_expiry', 'insurance_age'];

export type ScheduleViewPrefs = {
  sources: ScheduleFilterKey[];
  includeCompleted: boolean;
  includeOverdue: boolean;
  /** null = 모든 Google 캘린더. */
  googleCalendarIds: string[] | null;
  holidayMode: string | null;
};

export const SCHEDULE_VIEW_PREFS_TIMEOUT_MS = 5_000;

/** 웹 scheduleFilterKeyOf 와 같다: Google 출처(ONE FC 일정 포함)는 'google', CRM 은 type. */
export function scheduleFilterKeyOf(event: Pick<ScheduleEvent, 'source' | 'type'>): ScheduleFilterKey {
  return event.source === 'google' ? 'google' : (event.type as ScheduleFilterKey);
}

/** 서버 응답 정규화. 알 수 없는 키는 버리고, 쓸 수 있는 sources 가 없으면 null(=기본 전부 표시). */
export function normalizeScheduleViewPrefs(raw: unknown): ScheduleViewPrefs | null {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  const inner = body && body.prefs && typeof body.prefs === 'object' ? (body.prefs as Record<string, unknown>) : body;
  if (!inner || !Array.isArray(inner.sources)) return null;
  const sources = SCHEDULE_FILTER_KEYS.filter((key) => (inner.sources as unknown[]).includes(key));
  if (!sources.length) return null;
  const ids = Array.isArray(inner.googleCalendarIds) ? inner.googleCalendarIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '') : null;
  return {
    sources,
    includeCompleted: inner.includeCompleted === true,
    includeOverdue: inner.includeOverdue === true,
    googleCalendarIds: ids && ids.length ? ids : null,
    holidayMode: typeof inner.holidayMode === 'string' ? inner.holidayMode : null,
  };
}

/** Bearer 는 apiRequest 의 token 옵션이 붙인다. 404·실패·타임아웃·토큰 없음 → null. 절대 throw 하지 않는다. */
export async function fetchScheduleViewPrefs(token: string | null): Promise<ScheduleViewPrefs | null> {
  const bearer = token?.trim();
  if (!bearer) return null;
  try {
    return normalizeScheduleViewPrefs(await apiRequest<unknown>('/api/me/schedule-view-prefs', { token: bearer, timeoutMs: SCHEDULE_VIEW_PREFS_TIMEOUT_MS }));
  } catch {
    return null;
  }
}

function googleCalendarVisible(event: ScheduleEvent, ids: string[] | null): boolean {
  if (!ids || event.source !== 'google' || event.origin === 'onefc') return true;
  return event.calendarId != null && ids.includes(event.calendarId);
}

/** 웹과 같은 규칙: 일정 = sources∋scheduleFilterKeyOf, 할 일 = sources∋source && (includeCompleted || 미완료). prefs null → 그대로. */
export function applyScheduleViewPrefs<T extends Pick<ScheduleEventsResult, 'events' | 'tasks'>>(result: T, prefs: ScheduleViewPrefs | null): T {
  if (!prefs) return result;
  const events = result.events.filter((event) => prefs.sources.includes(scheduleFilterKeyOf(event)) && googleCalendarVisible(event, prefs.googleCalendarIds));
  const tasks = result.tasks.filter((task: ScheduleTask) => prefs.sources.includes(task.source) && (prefs.includeCompleted || task.status !== 'completed'));
  return { ...result, events, tasks };
}
