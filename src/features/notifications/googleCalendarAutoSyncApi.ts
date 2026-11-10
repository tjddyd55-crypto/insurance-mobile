import { ApiError, apiRequest } from '../../api/client';

export const GOOGLE_AUTO_SYNC_KINDS = [
  { key: 'todo', label: 'ONE FC 할 일' },
  { key: 'car_expiry', label: '자동차 만기 알림' },
  { key: 'insurance_age_date', label: '상령일 알림' },
  { key: 'special_date', label: '알림일(사용자 지정)' },
] as const;
export type GoogleAutoSyncKind = typeof GOOGLE_AUTO_SYNC_KINDS[number]['key'];
export type GoogleAutoSyncInput = { enabled: boolean; kinds: Record<GoogleAutoSyncKind, boolean> };
export type GoogleAutoSyncState = GoogleAutoSyncInput & {
  available: boolean;
  connected: boolean;
  calendarWritable: boolean;
  windowDays: number;
  syncStatus: 'idle' | 'syncing' | 'done' | 'error';
};
const PATH = '/api/service-integrations/google/calendar-autosync';

function readState(raw: unknown): GoogleAutoSyncState {
  const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  const value = body?.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : body;
  const kinds = value?.kinds as Record<string, unknown> | undefined;
  if (!value || typeof value.enabled !== 'boolean' || !kinds || GOOGLE_AUTO_SYNC_KINDS.some(({ key }) => typeof kinds[key] !== 'boolean')) {
    throw new ApiError('Google 캘린더 자동 연동 상태를 확인하지 못했습니다.', 500);
  }
  return {
    enabled: value.enabled,
    kinds: Object.fromEntries(GOOGLE_AUTO_SYNC_KINDS.map(({ key }) => [key, kinds[key]])) as GoogleAutoSyncInput['kinds'],
    available: value.available === true,
    connected: value.connected === true,
    calendarWritable: value.calendarWritable === true,
    windowDays: typeof value.windowDays === 'number' ? value.windowDays : 0,
    syncStatus: value.syncStatus === 'syncing' || value.syncStatus === 'done' || value.syncStatus === 'error' ? value.syncStatus : 'idle',
  };
}

export function googleAutoSyncInput(state: GoogleAutoSyncInput): GoogleAutoSyncInput {
  return { enabled: state.enabled, kinds: { ...state.kinds } };
}

/** Existing Web endpoint and per-user settings; no Google tokens on the client. */
export async function fetchGoogleAutoSync(token: string | null): Promise<GoogleAutoSyncState> {
  if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401);
  return readState(await apiRequest<unknown>(PATH, { token, timeoutMs: 20_000 }));
}

export async function saveGoogleAutoSync(token: string | null, input: GoogleAutoSyncInput): Promise<GoogleAutoSyncState> {
  if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401);
  const body = googleAutoSyncInput(input);
  const saved = readState(await apiRequest<unknown>(PATH, { method: 'PUT', token, body: JSON.stringify(body), timeoutMs: 20_000 }));
  if (saved.enabled !== body.enabled || GOOGLE_AUTO_SYNC_KINDS.some(({ key }) => saved.kinds[key] !== body.kinds[key])) {
    throw new ApiError('Google 캘린더 자동 연동 설정을 저장하지 못했습니다. 다시 열어 확인해 주세요.', 500);
  }
  return saved;
}
