/**
 * 일정 관리 — 웹과 같은 서버 API(SSOT). 새 테이블·새 API 없음.
 *  - 조회: GET /api/schedule/events?from&to&sources (Google 일정·할 일, CRM 알림일·자동차 만기·상령일, ONE FC 할 일)
 *  - 쓰기: Google 일정 /api/service-integrations/google/write/events (POST/PATCH/DELETE), Google 할 일 POST /write/tasks,
 *    ONE FC 할 일은 기존 POST /api/todos(features/todos/todosApi). 서버가 매 요청 권한 확인. Google 직접 호출 없음.
 */
import { ApiError, apiRequest } from '../../api/client';
import { formToGoogleInput, normalizeCalendarTargets, normalizeScheduleEvents, normalizeWriteTargets, taskFormToGoogleInput } from './scheduleModel';
import type { GoogleConnectPurpose, GoogleCalendarTarget, GoogleWriteTargets, ScheduleEventForm, ScheduleEventsResult, ScheduleTaskForm } from './types';

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

export async function fetchWriteTargets(token: string | null): Promise<GoogleWriteTargets> {
  return normalizeWriteTargets(await apiRequest<unknown>(`${WRITE_BASE}/targets`, { token: requireToken(token) }));
}

export async function createGoogleTaskFromSchedule(token: string | null, form: ScheduleTaskForm, requestId: string): Promise<void> {
  await apiRequest<unknown>(`${WRITE_BASE}/tasks`, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify(taskFormToGoogleInput(form, requestId)),
  });
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

/**
 * t396 Google 연결/재연결 시작. 서버(client=native)가 로그인 사용자에 묶인 1회용 state 로 Google 동의 URL 을 만든다.
 * 앱은 URL 을 시스템 브라우저 세션으로 열고, 서버 callback 이 <scheme>://google-connect 로 돌려보낸다. 토큰은 서버에만.
 * 서버가 아직 native 를 모르면(구버전) 웹 흐름(redirect)을 돌려주므로 그때는 열지 않는다.
 */
export async function startGoogleConnectFromApp(
  token: string | null,
  purpose: GoogleConnectPurpose,
  returnScheme: string,
): Promise<{ url: string; returnUrl: string }> {
  const path = purpose === 'write' ? '/api/service-integrations/google/write/connect' : '/api/service-integrations/google_calendar/connect';
  const body = await apiRequest<unknown>(path, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({ client: 'native', returnScheme }),
  });
  const root = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const data = (root.url ? root : (root.data as Record<string, unknown> | undefined)) ?? {};
  const url = typeof data.url === 'string' ? data.url : '';
  const returnUrl = typeof data.returnUrl === 'string' ? data.returnUrl : '';
  if (data.client !== 'native' || !url.startsWith('https://accounts.google.com/') || returnUrl !== `${returnScheme}://google-connect`) {
    throw new ApiError('앱에서 Google 연결을 아직 사용할 수 없습니다. 서버 업데이트 후 다시 시도해 주세요.', 409);
  }
  return { url, returnUrl };
}
