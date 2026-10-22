/**
 * 일정 관리 — 웹과 같은 서버 API(SSOT).
 *  - 조회: GET /api/schedule/events?from&to&sources (Google 일정·할 일, CRM 알림일·자동차 만기·상령일, ONE FC 일정·할 일)
 *  - 새 일정: POST /api/schedules (ONE FC calendar_items). Google 사본은 서버 autosync.
 *  - ONE FC 일정 수정·삭제: PATCH/DELETE /api/schedules/:id (목록 id 의 `onefc:` 접두사 제거)
 *  - Google 에서 태어난 일정: /api/service-integrations/google/write/events
 *  - ONE FC 할 일: 기존 POST /api/todos. 일정과 합치지 않는다.
 * 서버가 매 요청 권한 확인. Google 직접 호출 없음.
 */
import { ApiError, apiRequest } from '../../api/client';
import { createdEventId, formToGoogleInput, normalizeCalendarTargets, normalizeScheduleEvents, normalizeWriteTargets, onefcScheduleRawId, taskFormToGoogleInput } from './scheduleModel';
import type { GoogleConnectPurpose, GoogleCalendarTarget, GoogleWriteTargets, ScheduleEventForm, ScheduleEventsResult, ScheduleTaskForm } from './types';

const WRITE_BASE = '/api/service-integrations/google/write';
const ONEFC_SCHEDULES = '/api/schedules';

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

/** Google Tasks 생성. 일정 화면의 [할 일 추가]는 이 함수를 쓰지 않고 기존 POST /api/todos 만 쓴다. */
export async function createGoogleTaskFromSchedule(token: string | null, form: ScheduleTaskForm, requestId: string): Promise<void> {
  await apiRequest<unknown>(`${WRITE_BASE}/tasks`, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify(taskFormToGoogleInput(form, requestId)),
  });
}

/** Google 에서 태어난 일정 생성. 새 항목 버튼은 쓰지 않고 createOnefcSchedule 을 쓴다. */
export async function createScheduleEvent(token: string | null, form: ScheduleEventForm, requestId: string): Promise<void> {
  await apiRequest<unknown>(`${WRITE_BASE}/events`, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({ ...formToGoogleInput(form), requestId }),
  });
}

/**
 * ONE FC 일정 생성. 같은 requestId 재시도는 서버가 200 duplicate:true 로 한 건만 유지한다.
 * 반환 id 는 목록과 같은 `onefc:` 접두사 id (위젯 상세 링크).
 */
export async function createOnefcSchedule(token: string | null, form: ScheduleEventForm, requestId: string): Promise<string> {
  const payload = await apiRequest<unknown>(ONEFC_SCHEDULES, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({ ...formToGoogleInput(form), requestId }),
  });
  const id = createdEventId(payload);
  if (!id) throw new ApiError('저장 결과를 확인하지 못했어요. 다시 시도해 주세요', 502);
  return id;
}

/** ONE FC 일정 수정. id 는 raw 또는 `onefc:` 접두사. 경로에는 raw 만 넣는다. */
export async function updateOnefcSchedule(token: string | null, id: string, form: ScheduleEventForm): Promise<void> {
  await apiRequest<unknown>(`${ONEFC_SCHEDULES}/${encodeURIComponent(onefcScheduleRawId(id))}`, {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify(formToGoogleInput(form)),
  });
}

/** ONE FC 일정 소프트 삭제. id 는 raw 또는 `onefc:` 접두사. */
export async function deleteOnefcSchedule(token: string | null, id: string): Promise<void> {
  await apiRequest<unknown>(`${ONEFC_SCHEDULES}/${encodeURIComponent(onefcScheduleRawId(id))}`, {
    method: 'DELETE',
    token: requireToken(token),
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
