import type { AuthUser } from '../../api/authApi';

/**
 * PC CRM(`AuthProvider`)이 읽는 세션 키.
 * 긴 수명 토큰은 URL에 넣지 않고, 이 키의 localStorage 값으로만 넘긴다.
 *
 * 더 짧은 전달이 필요하면 DEV API에 아래를 추가한다. 웹이 redeem을 호출하기 전에는
 * 이 주입 방식을 쓴다.
 *
 * POST /api/auth/native-webview-handoff
 *   Authorization: Bearer <현재 액세스 토큰>
 *   Body: { "purpose": "customer-consulting", "path": "/coverage-simulator" }
 *   201: { "code": "<1회용>", "expiresInSec": 60 }
 *   서버는 code의 sha256만 저장하고, userId·path·만료를 묶는다. code와 Bearer는 로그에 남기지 않는다.
 *   path는 /coverage-simulator 접두사만 허용한다.
 *
 * POST /api/auth/native-webview-handoff/redeem
 *   Body: { "code": "<1회용>" }
 *   200: POST /api/auth/login 과 같은 { token, user }
 *   사용 즉시 삭제. 없거나 만료면 401. IP 제한.
 * 웹 AuthProvider는 sessionStorage `insurance.auth.handoff`의 code만 redeem한다.
 */
export const WEB_CRM_AUTH_STORAGE_KEY = 'insurance.auth.session';

export type WebCrmSession = {
  token: string;
  user: {
    id: string;
    username: string;
    role: AuthUser['role'];
    gaId: number;
    gaCode: string;
    gaName: string;
    companyId: number | null;
    displayName: string;
    teamId: string | null;
    subscription: AuthUser['subscription'];
  };
};

export function buildWebCrmSession(input: {
  token: string | null | undefined;
  user: AuthUser | null | undefined;
}): WebCrmSession | null {
  const token = input.token?.trim() ?? '';
  const user = input.user;
  if (!token || !user?.id || !user.username || !user.role) {
    return null;
  }
  if (!Number.isInteger(user.gaId) || user.gaId <= 0) {
    return null;
  }
  return {
    token,
    user: {
      id: String(user.id),
      username: String(user.username),
      role: user.role,
      gaId: user.gaId,
      gaCode: user.gaCode ?? '',
      gaName: user.gaName ?? '',
      companyId: user.role === 'INSURER_MANAGER' ? user.companyId : null,
      displayName: user.displayName?.trim() || user.username,
      teamId: user.teamId,
      subscription: user.subscription ?? null,
    },
  };
}

export function buildWebCrmSessionInjectionScript(session: WebCrmSession): string {
  const valueLiteral = JSON.stringify(JSON.stringify(session));
  return `(() => { try { localStorage.setItem(${JSON.stringify(WEB_CRM_AUTH_STORAGE_KEY)}, ${valueLiteral}); } catch (e) {} })(); true;`;
}

export function buildWebCrmSessionResumeScript(session: WebCrmSession, path: string): string {
  assertAppPath(path);
  const valueLiteral = JSON.stringify(JSON.stringify(session));
  return `(() => { try { localStorage.setItem(${JSON.stringify(WEB_CRM_AUTH_STORAGE_KEY)}, ${valueLiteral}); if (location.pathname === '/login') { location.replace(${JSON.stringify(path)}); } } catch (e) {} })(); true;`;
}

export function buildWebCrmSessionClearScript(): string {
  return `(() => { try { localStorage.removeItem(${JSON.stringify(WEB_CRM_AUTH_STORAGE_KEY)}); } catch (e) {} })(); true;`;
}

function assertAppPath(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('?') || path.includes('#') || path.includes('\\')) {
    throw new Error('상담 화면 경로가 올바르지 않습니다.');
  }
}
