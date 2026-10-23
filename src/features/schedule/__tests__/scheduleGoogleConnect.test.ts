import { apiRequest } from '../../../api/client';
import { startGoogleConnectFromApp } from '../scheduleApi';
import { googleConnectResultMessage, googleStatusBanner } from '../scheduleModel';
import type { ScheduleGoogleState } from '../types';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const mockedRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

function g(patch: Partial<Omit<ScheduleGoogleState, 'write'>> & { write?: Partial<ScheduleGoogleState['write']> } = {}): ScheduleGoogleState {
  return {
    connected: true,
    status: 'connected',
    connectAllowed: true,
    configured: true,
    tasks: { status: 'connected', needsReconsent: false },
    ...(patch as Partial<Omit<ScheduleGoogleState, 'write'>>),
    write: { enabled: true, calendarWritable: true, tasksWritable: true, needsWriteConsent: false, ...patch.write },
  };
}

describe('Google 연결 상태 배너(서버 상태 기준)', () => {
  it('연결 안 됨 / 재연결 필요 / 불러오기 실패 / 권한 필요 / 연결됨', () => {
    expect(googleStatusBanner(g({ connected: false, status: 'disconnected' }))).toMatchObject({ label: '연결 안 됨', action: { purpose: 'connect' } });
    expect(googleStatusBanner(g({ status: 'needs_reauth' }))).toMatchObject({ label: '재연결 필요', action: { label: 'Google 재연결', purpose: 'connect' } });
    expect(googleStatusBanner(g({ status: 'error' }))).toMatchObject({ label: '오류', action: null });
    expect(googleStatusBanner(g({ tasks: { status: 'scope_missing', needsReconsent: true } }))).toMatchObject({ label: '권한 필요', action: { purpose: 'connect' } });
    expect(googleStatusBanner(g({ write: { calendarWritable: false, needsWriteConsent: true } }))).toMatchObject({ label: '쓰기 권한 필요', action: { purpose: 'write' } });
    expect(googleStatusBanner(g())).toEqual({ tone: 'success', label: '연결됨', message: null, action: null });
    expect(googleStatusBanner(g({ write: { enabled: false, calendarWritable: false, tasksWritable: false } }))).toMatchObject({ label: '연결됨', action: null });
  });

  it('서버 미설정은 배너 없음, 준비 중(connectAllowed=false)은 버튼 없음', () => {
    expect(googleStatusBanner(g({ configured: false, status: 'unconfigured', connected: false }))).toBeNull();
    expect(googleStatusBanner(g({ connected: false, status: 'disconnected', connectAllowed: false }))).toMatchObject({ label: '연결 안 됨', action: null, message: 'Google 연동 준비 중입니다.' });
    expect(googleStatusBanner(g({ status: 'needs_reauth', connectAllowed: false }))?.action).toBeNull();
  });

  it('복귀 URL 결과 문구(토큰 없음, 결과 코드만)', () => {
    expect(googleConnectResultMessage({ type: 'success', url: 'onefc://google-connect?google=connected' })).toEqual({ ok: true, text: 'Google을 연결했습니다.' });
    expect(googleConnectResultMessage({ type: 'success', url: 'onefc://google-connect?google=write_connected&reason=write_scope_partial' }).text).toContain('일부');
    expect(googleConnectResultMessage({ type: 'success', url: 'onefc://google-connect?google=error&reason=access_denied' })).toEqual({ ok: false, text: 'Google 동의를 취소했습니다.' });
    expect(googleConnectResultMessage({ type: 'cancel' }).ok).toBe(false);
    expect(googleConnectResultMessage({ type: 'dismiss' }).ok).toBe(false);
  });
});

describe('startGoogleConnectFromApp (서버 client=native)', () => {
  beforeEach(() => mockedRequest.mockReset());

  it('읽기 연결은 google_calendar/connect, 쓰기 권한은 google/write/connect 로 client=native·scheme 을 보낸다', async () => {
    mockedRequest.mockResolvedValue({ data: { action: 'open_external', client: 'native', url: 'https://accounts.google.com/o/oauth2/v2/auth?state=s', returnUrl: 'onefc://google-connect' } });
    await expect(startGoogleConnectFromApp('t', 'connect', 'onefc')).resolves.toEqual({ url: 'https://accounts.google.com/o/oauth2/v2/auth?state=s', returnUrl: 'onefc://google-connect' });
    expect(mockedRequest.mock.calls[0]![0]).toBe('/api/service-integrations/google_calendar/connect');
    expect(JSON.parse(String(mockedRequest.mock.calls[0]![1]?.body))).toEqual({ client: 'native', returnScheme: 'onefc' });
    await startGoogleConnectFromApp('t', 'write', 'onefc');
    expect(mockedRequest.mock.calls[1]![0]).toBe('/api/service-integrations/google/write/connect');
  });

  it('구버전 서버(웹 redirect 흐름)나 다른 호스트·다른 복귀 URL 이면 열지 않는다', async () => {
    mockedRequest.mockResolvedValueOnce({ data: { action: 'redirect', url: 'https://accounts.google.com/o/oauth2/v2/auth?state=s' } });
    await expect(startGoogleConnectFromApp('t', 'connect', 'onefc')).rejects.toMatchObject({ status: 409 });
    mockedRequest.mockResolvedValueOnce({ data: { client: 'native', url: 'https://evil.example/auth', returnUrl: 'onefc://google-connect' } });
    await expect(startGoogleConnectFromApp('t', 'connect', 'onefc')).rejects.toMatchObject({ status: 409 });
    mockedRequest.mockResolvedValueOnce({ data: { client: 'native', url: 'https://accounts.google.com/x', returnUrl: 'other://google-connect' } });
    await expect(startGoogleConnectFromApp('t', 'connect', 'onefc')).rejects.toMatchObject({ status: 409 });
  });

  it('연동(공유 hook): WebView 가 아니라 시스템 인증 세션, 끝나면 refresh=1, PC 안내 문구 제거', () => {
    const hook = read('useGoogleIntegration.ts');
    const screen = read('ScheduleScreen.tsx');
    expect(hook).toContain('WebBrowser.openAuthSessionAsync(started.url, started.returnUrl)');
    expect(hook).toContain('refresh: true');
    expect(hook + screen).not.toMatch(/react-native-webview|<WebView/);
    expect(screen).toContain('await reloadAfterWrite();');
    expect(screen).not.toContain('PC 일정 관리에서 설정할 수 있습니다');
    expect(screen).toContain('label="새로고침"');
  });
});
