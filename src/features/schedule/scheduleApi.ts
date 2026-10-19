/**
 * 일정 관리 — 웹과 같은 서버 API(SSOT). 새 테이블·새 API 없음.
 *  - 조회: GET /api/schedule/events?from&to&sources (Google 일정·할 일, CRM 알림일·자동차 만기·상령일, ONE FC 할 일)
 *  - 쓰기: Google 일정만 /api/service-integrations/google/write/events (POST/PATCH/DELETE), 서버가 매 요청 권한 확인.
 */
import { ApiError, apiRequest } from '../../api/client';
import { formToGoogleInput, normalizeCalendarTargets, normalizeScheduleEvents } from './scheduleModel';
import type { GoogleCalendarTarget, ScheduleEventForm, ScheduleEventsResult } from './types';

const WRITE_BASE = '/api/service-integrations/google/write';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function fetchScheduleEvents(
  token: string | null,
  query: { from: string; to: string; refresh?: boolean },
): Promise<ScheduleEventsResult> {
  const params = new URLSearchParams();
  params.set('from', query.from);
  params.set('to', query.to);
  params.set('sources', 'all');
  if (query.refresh) params.set('refresh', '1');
  return normalizeScheduleEvents(await apiRequest<unknown>(`/api/schedule/events?${params.toString()}`, { token: requireToken(token) }));
}

export async function fetchWritableCalendars(token: string | null): Promise<GoogleCalendarTarget[]> {
  return normalizeCalendarTargets(await apiRequest<unknown>(`${WRITE_BASE}/targets`, { token: requireToken(token) }));
}

export async function createScheduleEvent(token: string | null, form: ScheduleEventForm, requestId: string): Promise<void> {
  await apiRequest<unknown>(`${WRITE_BASE}/events`, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({ ...formToGoogleInput(form), requestId }),
  });
}

export async function updateScheduleEvent(token: string | null, eventId: string, form: ScheduleEventForm): Promise<void> {
  await apiRequest<unknown>(`${WRITE_BASE}/events`, {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify({ ...formToGoogleInput(form), eventId }),
  });
}

export async function deleteScheduleEvent(token: string | null, calendarId: string, eventId: string): Promise<void> {
  await apiRequest<unknown>(`${WRITE_BASE}/events`, {
    method: 'DELETE',
    token: requireToken(token),
    body: JSON.stringify({ calendarId, eventId }),
  });
}
