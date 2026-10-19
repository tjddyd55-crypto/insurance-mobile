import type { AuthUser } from '../../../api/authApi';
import {
  buildMobileCardUrl,
  buildSessionInjectionScript,
  buildWebSession,
  classifyMobileCardNavigation,
  CLEAR_WEB_SESSION_SCRIPT,
  MOBILE_CARD_BRIDGE_SHARE,
  parseMobileCardBridgeMessage,
  WEB_AUTH_STORAGE_KEY,
} from '../mobileCardWebSession';
import { PRODUCTION_WEB_ORIGIN, resolveWebAppOrigin } from '../../../config/environment';

const ORIGIN = 'https://onefc.platform-assets.com';

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

function user(id: string, patch: Partial<AuthUser> = {}): AuthUser {
  return {
    id,
    username: `u${id}`,
    role: 'USER',
    gaId: 3,
    gaCode: 'ONEFC',
    gaName: '원에프씨',
    companyId: null,
    displayName: `설계사${id}`,
    teamId: null,
    tenantCode: 'onefc',
    subscription: null,
    ...patch,
  };
}

class MemoryStorage {
  map = new Map<string, string>();
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
  removeItem(key: string) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

function fakeWindow(origin: string) {
  const posted: string[] = [];
  const win = {
    location: { origin },
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
    navigator: {} as Record<string, unknown>,
    ReactNativeWebView: { postMessage: (message: string) => posted.push(message) },
  };
  return { win, posted };
}

function run(script: string, win: unknown) {
  return new Function('window', script)(win);
}

describe('mobile card WebView auth handoff', () => {
  it('opens /profile/mobile-card with no token in the URL', () => {
    const url = buildMobileCardUrl(ORIGIN);
    expect(url).toBe(`${ORIGIN}/profile/mobile-card`);
    expect(url).not.toMatch(/[?#]/);
    expect(url).not.toMatch(/token/i);
    expect(() => buildMobileCardUrl('http://insecure.example')).toThrow();
  });

  it('uses the canonical production web origin and the DEV API origin for dev', () => {
    expect(resolveWebAppOrigin('production')).toBe(PRODUCTION_WEB_ORIGIN);
    expect(resolveWebAppOrigin('development')).toBe('https://insurance-dev.up.railway.app');
  });

  it('builds the web SSOT session shape (token + user with id/role/gaId)', () => {
    expect(buildWebSession(null, user('1'))).toBeNull();
    expect(buildWebSession('t', null)).toBeNull();
    const session = buildWebSession(' tok ', user('7'));
    expect(session?.token).toBe('tok');
    expect(session?.user).toMatchObject({ id: '7', role: 'USER', gaId: 3, gaCode: 'ONEFC' });
  });

  it('writes the session only on the expected origin, after wiping that origin storage', () => {
    const session = buildWebSession('tok-a', user('1'))!;
    const { win } = fakeWindow(ORIGIN);
    win.localStorage.setItem('other', 'x');
    win.sessionStorage.setItem('s', 'y');
    run(buildSessionInjectionScript(ORIGIN, session), win);
    expect(JSON.parse(win.localStorage.getItem(WEB_AUTH_STORAGE_KEY)!)).toEqual(session);
    expect(win.localStorage.getItem('other')).toBeNull();
    expect(win.sessionStorage.getItem('s')).toBeNull();

    const foreign = fakeWindow('https://evil.example');
    run(buildSessionInjectionScript(ORIGIN, session), foreign.win);
    expect(foreign.win.localStorage.getItem(WEB_AUTH_STORAGE_KEY)).toBeNull();
  });

  it('re-login as another account leaves no previous session', () => {
    const { win } = fakeWindow(ORIGIN);
    run(buildSessionInjectionScript(ORIGIN, buildWebSession('tok-a', user('1'))!), win);
    run(buildSessionInjectionScript(ORIGIN, buildWebSession('tok-b', user('2'))!), win);
    const stored = JSON.parse(win.localStorage.getItem(WEB_AUTH_STORAGE_KEY)!);
    expect(stored.token).toBe('tok-b');
    expect(stored.user.id).toBe('2');
    expect([...win.localStorage.map.values()].join('')).not.toContain('tok-a');
  });

  it('clears the web session when leaving', () => {
    const { win } = fakeWindow(ORIGIN);
    run(buildSessionInjectionScript(ORIGIN, buildWebSession('tok-a', user('1'))!), win);
    run(CLEAR_WEB_SESSION_SCRIPT, win);
    expect(win.localStorage.getItem(WEB_AUTH_STORAGE_KEY)).toBeNull();
  });

  it('routes navigator.share to the native share bridge', async () => {
    const { win, posted } = fakeWindow(ORIGIN);
    run(buildSessionInjectionScript(ORIGIN, buildWebSession('tok', user('1'))!), win);
    await (win.navigator.share as (data: unknown) => Promise<void>)({ title: '명함', url: `${ORIGIN}/fc/kim` });
    expect(posted).toHaveLength(1);
    const message = parseMobileCardBridgeMessage(posted[0]!, ORIGIN);
    expect(message).toEqual({ type: MOBILE_CARD_BRIDGE_SHARE, title: '명함', text: '', url: `${ORIGIN}/fc/kim` });
    expect(parseMobileCardBridgeMessage(JSON.stringify({ type: MOBILE_CARD_BRIDGE_SHARE, url: 'https://evil.example/x' }), ORIGIN)).toBeNull();
    expect(parseMobileCardBridgeMessage('not json', ORIGIN)).toBeNull();
  });

  it('classifies navigation: tel → dialer, login → native error, other pages blocked', () => {
    expect(classifyMobileCardNavigation(`${ORIGIN}/profile/mobile-card`, ORIGIN)).toEqual({ kind: 'allow' });
    expect(classifyMobileCardNavigation('tel:01012345678', ORIGIN)).toEqual({ kind: 'dial', url: 'tel:01012345678' });
    expect(classifyMobileCardNavigation('sms:01012345678', ORIGIN).kind).toBe('dial');
    expect(classifyMobileCardNavigation(`${ORIGIN}/login`, ORIGIN)).toEqual({ kind: 'login' });
    expect(classifyMobileCardNavigation(`${ORIGIN}/consultation-leads`, ORIGIN)).toEqual({ kind: 'native', path: '/consultation-leads' });
    expect(classifyMobileCardNavigation(`${ORIGIN}/fc/kim`, ORIGIN)).toEqual({ kind: 'external', url: `${ORIGIN}/fc/kim` });
    expect(classifyMobileCardNavigation('https://pf.kakao.com/x', ORIGIN).kind).toBe('external');
    expect(classifyMobileCardNavigation(`${ORIGIN}/dashboard`, ORIGIN)).toEqual({ kind: 'block' });
    expect(classifyMobileCardNavigation('intent://x#Intent;end', ORIGIN)).toEqual({ kind: 'block' });
    expect(classifyMobileCardNavigation('javascript:alert(1)', ORIGIN)).toEqual({ kind: 'block' });
  });

  it('screen contract: incognito, no cache, account-keyed, focus-gated, no URL token', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'MobileCardWebViewScreen.tsx'), 'utf8');
    expect(source).toContain('injectedJavaScriptBeforeContentLoaded={injected}');
    expect(source).toContain('incognito');
    expect(source).toContain('cacheEnabled={false}');
    expect(source).toContain('key={`${session.user.id}:${mountKey}`}');
    expect(source).toContain('{focused ? (');
    expect(source).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(source).toContain('webRef.current.goBack()');
    expect(source).toContain('source={{ uri: url }}');
    expect(source).not.toMatch(/[?&]token=/);
  });
});
