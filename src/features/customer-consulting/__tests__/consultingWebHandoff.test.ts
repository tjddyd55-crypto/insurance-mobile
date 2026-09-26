import type { AuthUser } from '../../../api/authApi';
import {
  evaluateConsultingWebNavigation,
  resolveConsultingWebTarget,
} from '../consultingWebNavigation';
import {
  buildWebCrmSession,
  buildWebCrmSessionInjectionScript,
  buildWebCrmSessionResumeScript,
  WEB_CRM_AUTH_STORAGE_KEY,
} from '../webCrmSession';

const DEV_ORIGIN = 'https://insurance-dev.up.railway.app';
const PROD_ORIGIN = 'https://insurance-production-7bd8.up.railway.app';
const TOKEN = 'jwt-test-value';

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'designer01',
    role: 'USER',
    gaId: 7,
    gaCode: 'TEST',
    gaName: '테스트 GA',
    companyId: null,
    displayName: '설계사',
    teamId: null,
    tenantCode: '',
    subscription: null,
    ...overrides,
  };
}

describe('consulting web session handoff', () => {
  it('builds the PC localStorage session without a URL', () => {
    const session = buildWebCrmSession({ token: TOKEN, user: user() });
    expect(session?.user.gaId).toBe(7);
    expect(session?.user.role).toBe('USER');
    const script = buildWebCrmSessionInjectionScript(session!);
    expect(script).toContain(WEB_CRM_AUTH_STORAGE_KEY);
    expect(script).toContain(TOKEN);
    expect(script).not.toMatch(/https?:\/\//);
    expect(script).not.toMatch(/[?&]token=/);
  });

  it('refuses a session the PC app would reject', () => {
    expect(buildWebCrmSession({ token: '  ', user: user() })).toBeNull();
    expect(buildWebCrmSession({ token: TOKEN, user: user({ gaId: 0 }) })).toBeNull();
  });

  it('resumes after the PC login redirect using a path only', () => {
    const session = buildWebCrmSession({ token: TOKEN, user: user() });
    const script = buildWebCrmSessionResumeScript(session!, '/coverage-simulator');
    expect(script).toContain('location.replace("/coverage-simulator")');
    expect(script).not.toContain(`${TOKEN}?`);
    expect(script).not.toMatch(/[?&]token=/);
  });

  it('opens only the DEV origin and never the production host', () => {
    const dev = resolveConsultingWebTarget('/coverage-simulator', {
      isDevApp: true,
      apiBaseUrl: DEV_ORIGIN,
    }, PROD_ORIGIN);
    expect(dev).toEqual({
      ok: true,
      origin: DEV_ORIGIN,
      pageUrl: `${DEV_ORIGIN}/coverage-simulator`,
    });
    expect(resolveConsultingWebTarget('/personal-binders', {
      isDevApp: true,
      apiBaseUrl: DEV_ORIGIN,
    }, PROD_ORIGIN)).toEqual({
      ok: true,
      origin: DEV_ORIGIN,
      pageUrl: `${DEV_ORIGIN}/personal-binders`,
    });
    expect(resolveConsultingWebTarget('/coverage-simulator', {
      isDevApp: false,
      apiBaseUrl: DEV_ORIGIN,
    }, PROD_ORIGIN).ok).toBe(false);
    expect(resolveConsultingWebTarget('/coverage-simulator', {
      isDevApp: true,
      apiBaseUrl: PROD_ORIGIN,
    }, PROD_ORIGIN)).toEqual({ ok: false, reason: 'insecure-origin' });
    expect(resolveConsultingWebTarget('#', {
      isDevApp: true,
      apiBaseUrl: DEV_ORIGIN,
    }, PROD_ORIGIN)).toEqual({ ok: false, reason: 'missing-path' });
  });

  it('blocks token query strings and foreign hosts', () => {
    const page = `${DEV_ORIGIN}/coverage-simulator`;
    expect(evaluateConsultingWebNavigation(page, DEV_ORIGIN, TOKEN)).toBe('allow');
    expect(evaluateConsultingWebNavigation(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR',
      DEV_ORIGIN,
      TOKEN,
    )).toBe('allow');
    expect(evaluateConsultingWebNavigation(`${page}?token=${TOKEN}`, DEV_ORIGIN, TOKEN)).toBe('deny');
    expect(evaluateConsultingWebNavigation(`${page}?access_token=abc`, DEV_ORIGIN, TOKEN)).toBe('deny');
    expect(evaluateConsultingWebNavigation(`${DEV_ORIGIN}/coverage/share/${TOKEN}`, DEV_ORIGIN, TOKEN)).toBe('deny');
    expect(evaluateConsultingWebNavigation(`${PROD_ORIGIN}/coverage-simulator`, DEV_ORIGIN, TOKEN)).toBe('deny');
    expect(evaluateConsultingWebNavigation(`http://insurance-dev.up.railway.app/coverage-simulator`, DEV_ORIGIN, TOKEN)).toBe('deny');
  });
});
