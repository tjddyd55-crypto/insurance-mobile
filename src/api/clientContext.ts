
/**
 * 접속 채널/기기 telemetry 헤더 (서버 user access context 규약).
 *
 * 주의: 이 값들은 오직 "어떤 채널/기기로 접속했는지" 기록용 telemetry 이다.
 * 서버는 인증·권한 판단에 절대 사용하지 않으며, 클라이언트도 보안 수단으로 쓰지 않는다.
 * IMEI/MAC/광고 ID/위치 등 식별·추적 정보는 수집하지 않는다.
 */
export const CLIENT_CONTEXT_HEADER = {
  clientType: 'X-ONEFC-Client-Type',
  appVersion: 'X-ONEFC-App-Version',
  deviceModel: 'X-ONEFC-Device-Model',
  platform: 'X-ONEFC-Platform',
} as const;

export const CLIENT_CONTEXT_MAX_LENGTH = 64;

export interface ClientContextInput {
  os: string | null | undefined;
  appVersion: unknown;
  deviceModel: unknown;
}

/** 제어문자 제거, 연속 공백 정리, 길이 제한. 비면 null. */
export function sanitizeHeaderValue(value: unknown, max = CLIENT_CONTEXT_MAX_LENGTH): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const cleaned = String(value)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
  return cleaned ? cleaned : null;
}

export function buildClientContextHeaders(input: ClientContextInput): Record<string, string> {
  const platform = input.os === 'android' ? 'android' : input.os === 'ios' ? 'ios' : null;
  const headers: Record<string, string> = {};
  if (platform) {
    headers[CLIENT_CONTEXT_HEADER.clientType] = platform === 'android' ? 'native_android' : 'native_ios';
    headers[CLIENT_CONTEXT_HEADER.platform] = platform;
  }
  const appVersion = sanitizeHeaderValue(input.appVersion);
  if (appVersion) headers[CLIENT_CONTEXT_HEADER.appVersion] = appVersion;
  const deviceModel = sanitizeHeaderValue(input.deviceModel);
  if (deviceModel) headers[CLIENT_CONTEXT_HEADER.deviceModel] = deviceModel;
  return headers;
}

/**
 * 네이티브 모듈은 최초 호출 시에만 require 한다(테스트/비네이티브 환경에서 client.ts import 만으로 깨지지 않게).
 * 이미 설치된 expo-constants / expo-device 만 사용 — 새 dependency 없음.
 */
function readNativeClientContext(): ClientContextInput {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Platform } = require('react-native') as typeof import('react-native');
  let appVersion: unknown = null;
  try {
    const Constants = (require('expo-constants') as typeof import('expo-constants')).default;
    appVersion = Constants?.expoConfig?.version ?? null;
  } catch {
    appVersion = null;
  }
  let deviceModel: unknown = null;
  try {
    deviceModel = (require('expo-device') as typeof import('expo-device')).modelName;
  } catch {
    deviceModel = null;
  }
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { os: Platform?.OS, appVersion, deviceModel };
}

let cached: Readonly<Record<string, string>> | null = null;

/** 앱 실행 후 첫 API 요청 시 1회 계산 후 캐시(이후 재계산 없음). */
export function getClientContextHeaders(): Readonly<Record<string, string>> {
  if (!cached) {
    try {
      cached = Object.freeze(buildClientContextHeaders(readNativeClientContext()));
    } catch {
      cached = Object.freeze({});
    }
  }
  return cached;
}

/** 테스트 전용 */
export function __resetClientContextCacheForTests(): void {
  cached = null;
}
