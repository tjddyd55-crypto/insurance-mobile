/**
 * 모바일 명함 편집 WebView ↔ 웹 인증 SSOT 연결.
 *
 * 웹 인증 SSOT: localStorage['insurance.auth.session'] = { token, user } (insurance src/features/auth/AuthProvider.tsx).
 * 웹은 Bearer 헤더만 쓰고 인증 쿠키는 없다. 그래서 앱은
 *  - URL 에 토큰을 싣지 않는다(쿼리·해시 모두 없음).
 *  - injectedJavaScriptBeforeContentLoaded 로, 기대 origin 에서만, 앱이 이미 가진 같은 토큰을 웹 SSOT 키에 쓴다.
 *  - 매 로드마다 그 origin 의 localStorage/sessionStorage 를 먼저 비운다(다른 계정 세션이 남지 않는다).
 * 새 토큰을 만들거나 따로 저장하지 않는다.
 */
import type { AuthUser } from '../../api/authApi';

export const WEB_AUTH_STORAGE_KEY = 'insurance.auth.session';
export const MOBILE_CARD_WEB_PATH = '/profile/mobile-card';
/** 웹 공개 프로필(미리보기) 경로 접두사 — insurance advisorPublicRoutes.ts ADVISOR_PROFILE_PATH_PREFIX */
export const ADVISOR_PUBLIC_PATH_PREFIX = '/fc/';

export const MOBILE_CARD_BRIDGE_SHARE = 'ONEFC_MOBILE_CARD_SHARE';

/**
 * 앱 임베드 표시(비밀값 아님). 웹(insurance src/features/native-app/nativeAppEmbed.ts)은 이 값이 있고
 * 경로가 /profile/mobile-card 일 때만 웹 공통 헤더를 그리지 않는다 → 앱 헤더만 보인다.
 */
export const NATIVE_EMBED_WINDOW_KEY = '__ONEFC_NATIVE_EMBED__';
export const NATIVE_EMBED_MOBILE_CARD = 'mobile-card';

export type WebSessionUser = Pick<
  AuthUser,
  'id' | 'username' | 'role' | 'gaId' | 'gaCode' | 'gaName' | 'companyId' | 'displayName' | 'teamId'
> & { subscription?: AuthUser['subscription'] };

export type WebSession = { token: string; user: WebSessionUser };

export function normalizeWebOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== 'https:') throw new Error('모바일 명함은 https 웹 주소에서만 엽니다.');
  return url.origin;
}

/** 토큰·쿼리 없는 모바일 명함 주소. */
export function buildMobileCardUrl(origin: string): string {
  return `${normalizeWebOrigin(origin)}${MOBILE_CARD_WEB_PATH}`;
}

/** 웹 readStoredSession 이 받는 형태(token, user.id, role, gaId …)로만 만든다. */
export function buildWebSession(token: string | null, user: AuthUser | null): WebSession | null {
  const trimmed = String(token ?? '').trim();
  if (!trimmed || !user || !String(user.id ?? '').trim()) return null;
  return {
    token: trimmed,
    user: {
      id: String(user.id),
      username: user.username,
      role: user.role,
      gaId: user.gaId,
      gaCode: user.gaCode,
      gaName: user.gaName,
      companyId: user.companyId,
      displayName: user.displayName,
      teamId: user.teamId,
      ...(user.subscription !== undefined ? { subscription: user.subscription } : {}),
    },
  };
}

/** JS 소스 안에 안전하게 넣는 JSON 리터럴. */
function jsLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * 문서 로드 전에 실행되는 스크립트.
 * - origin 이 다르면 아무것도 하지 않는다(토큰이 다른 사이트로 가지 않는다).
 * - 그 origin 의 저장소를 비운 뒤 현재 앱 세션만 쓴다.
 * - navigator.share 를 앱 공유 시트로 넘긴다.
 */
export function buildSessionInjectionScript(origin: string, session: WebSession): string {
  const expectedOrigin = normalizeWebOrigin(origin);
  return `(function(){try{
if(window.location.origin!==${jsLiteral(expectedOrigin)}){return;}
try{window.localStorage.clear();}catch(e){}
try{window.sessionStorage.clear();}catch(e){}
window.localStorage.setItem(${jsLiteral(WEB_AUTH_STORAGE_KEY)},${jsLiteral(JSON.stringify(session))});
try{Object.defineProperty(window,${jsLiteral(NATIVE_EMBED_WINDOW_KEY)},{configurable:true,value:${jsLiteral(NATIVE_EMBED_MOBILE_CARD)}});}catch(e){window[${jsLiteral(NATIVE_EMBED_WINDOW_KEY)}]=${jsLiteral(NATIVE_EMBED_MOBILE_CARD)};}
var bridge=window.ReactNativeWebView;
if(bridge&&typeof bridge.postMessage==='function'){
var share=function(data){data=data||{};bridge.postMessage(JSON.stringify({type:${jsLiteral(MOBILE_CARD_BRIDGE_SHARE)},title:String(data.title||''),text:String(data.text||''),url:String(data.url||'')}));return Promise.resolve();};
try{Object.defineProperty(window.navigator,'share',{configurable:true,writable:true,value:share});}catch(e){window.navigator.share=share;}
}
}catch(e){}})();true;`;
}

/** 화면을 떠날 때(포커스 해제·로그아웃) 웹 세션을 지운다. */
export const CLEAR_WEB_SESSION_SCRIPT = `(function(){try{window.localStorage.clear();}catch(e){}try{window.sessionStorage.clear();}catch(e){}})();true;`;

export type MobileCardNavigation =
  | { kind: 'allow' }
  | { kind: 'login' }
  | { kind: 'dial'; url: string }
  | { kind: 'external'; url: string }
  | { kind: 'native'; path: string }
  | { kind: 'block' };

/** 같은 origin 안에서 WebView 에 남겨 둘 경로. 나머지는 앱 화면으로 넘기거나 막는다. */
function sameOriginTarget(pathname: string): MobileCardNavigation {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === MOBILE_CARD_WEB_PATH) return { kind: 'allow' };
  if (path === '/login' || path.startsWith('/login/')) return { kind: 'login' };
  if (path === '/consultation-leads') return { kind: 'native', path: '/consultation-leads' };
  if (path === '/profile') return { kind: 'native', path: '/profile' };
  return { kind: 'block' };
}

/**
 * WebView 이동 판단.
 * tel:/sms:/mailto: 는 OS 앱, 다른 https 사이트·공개 프로필 미리보기는 시스템 브라우저.
 */
export function classifyMobileCardNavigation(rawUrl: string, origin: string): MobileCardNavigation {
  const url = String(rawUrl ?? '').trim();
  if (!url || url === 'about:blank') return { kind: 'allow' };
  const lower = url.toLowerCase();
  if (lower.startsWith('tel:') || lower.startsWith('sms:') || lower.startsWith('mailto:')) {
    return { kind: 'dial', url };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: 'block' };
  }
  if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') return { kind: 'allow' };
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { kind: 'block' };
  const expected = normalizeWebOrigin(origin);
  if (parsed.origin !== expected) {
    return parsed.protocol === 'https:' ? { kind: 'external', url } : { kind: 'block' };
  }
  if (parsed.pathname.startsWith(ADVISOR_PUBLIC_PATH_PREFIX)) return { kind: 'external', url };
  return sameOriginTarget(parsed.pathname);
}

export type MobileCardBridgeMessage = { type: typeof MOBILE_CARD_BRIDGE_SHARE; title: string; text: string; url: string };

export function parseMobileCardBridgeMessage(raw: string, origin: string): MobileCardBridgeMessage | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value?.type !== MOBILE_CARD_BRIDGE_SHARE) return null;
    const url = String(value.url ?? '').trim();
    if (url) {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.origin !== normalizeWebOrigin(origin)) return null;
    }
    return {
      type: MOBILE_CARD_BRIDGE_SHARE,
      title: String(value.title ?? '').slice(0, 200),
      text: String(value.text ?? '').slice(0, 500),
      url,
    };
  } catch {
    return null;
  }
}
