/**
 * 앱 업데이트 정책.
 *
 * OTA는 기존 expo-updates(channel native-production, runtimeVersion appVersion)를 유지한다.
 * Play 인앱 업데이트는 Android 프로덕션 기본값이 FLEXIBLE이다.
 * IMMEDIATE는 이 파일의 resolvePlayUpdateFlow만 바꾸면 타는 별도 경로이고,
 * 서버·원격 강제 업데이트는 두지 않는다.
 */

export const PRODUCTION_OTA_CHANNEL = 'native-production';
export const DEVELOPMENT_OTA_CHANNEL = 'native-development';

/** check/fetch가 이 시간을 넘기면 포기하고 앱은 그대로 진입한다. */
export const UPDATE_CHECK_TIMEOUT_MS = 15_000;

/** 포그라운드 복귀 시 OTA/Play 가용성 재검사 간격. 타이머 폴링은 하지 않는다. */
export const FOREGROUND_UPDATE_THROTTLE_MS = 15 * 60 * 1000;

export const PLAY_INSTALLER_PACKAGE = 'com.android.vending';

/**
 * Expo SDK 57 ExecutionEnvironment.StoreClient.
 * Expo Go와 expo-dev-client 개발 빌드가 이 값이다.
 * EAS release(production, preview, production-apk)는 standalone이라 여기 포함되지 않는다.
 */
export const DEV_CLIENT_EXECUTION_ENVIRONMENT = 'storeClient';

export const OTA_APPLY_MESSAGE = '새 업데이트가 준비되었습니다. 최신 버전을 적용합니다.';
export const OTA_APPLY_ACTION = '지금 적용';

export const PLAY_AVAILABLE_MESSAGE =
  '새로운 ONE FC 버전이 있습니다. 안정적인 사용을 위해 최신 버전으로 업데이트해 주세요.';
export const PLAY_UPDATE_ACTION = '업데이트';
export const PLAY_LATER_ACTION = '나중에';

export const PLAY_DOWNLOADED_MESSAGE = '업데이트가 준비되었습니다.';
export const PLAY_INSTALL_ACTION = '지금 설치';

export type PlayUpdateFlow = 'flexible' | 'immediate';

export type PlayCheckStatus =
  | 'no_update'
  | 'available'
  | 'downloaded'
  | 'in_progress'
  | 'failed';

/**
 * 콜드 스타트에서 reloadAsync를 바로 호출하지 않는다.
 * 스플래시 최소 표시, 인증 부트, 첫 화면 이동과 겹치면 검은 화면이나 중간에 끊긴 네비게이션이 생긴다.
 * 포그라운드 복귀 중 자동 재시작은 작성 중이던 화면을 버린다.
 * 그래서 실행 시점과 관계없이 다운로드가 끝난 뒤에만 확인 문구를 보여주고,
 * [지금 적용]을 눌렀을 때 reloadAsync를 호출한다.
 * 사용자가 적용하지 않으면 받은 번들은 다음 콜드 스타트에 expo-updates가 적용한다.
 */
export function resolvePlayUpdateFlow(): PlayUpdateFlow {
  return 'flexible';
}

export function isDevClientRuntime(input: {
  executionEnvironment: string | null;
  channel: string | null;
}): boolean {
  if (input.executionEnvironment === DEV_CLIENT_EXECUTION_ENVIRONMENT) {
    return true;
  }
  return input.channel === DEVELOPMENT_OTA_CHANNEL;
}

/**
 * Play 인앱 업데이트는 Play가 설치한 Android 프로덕션 앱에서만 의미가 있다.
 * 설치 경로(com.android.vending) 확인은 네이티브에서 한 번 더 한다.
 * preview APK, production-apk, 사이드로드는 여기서 통과해도 네이티브가 not_from_play로 넘긴다.
 */
export function shouldOfferPlayUpdate(input: {
  platform: string;
  isDev: boolean;
  isDevClient: boolean;
  isProductionApp: boolean;
}): boolean {
  if (input.platform !== 'android') {
    return false;
  }
  if (input.isDev || input.isDevClient || !input.isProductionApp) {
    return false;
  }
  return true;
}

export function normalizePlayStatus(status: string | null | undefined): PlayCheckStatus {
  if (status === 'available' || status === 'downloaded' || status === 'in_progress') {
    return status;
  }
  if (status === 'no_update' || status === 'not_from_play' || status === 'type_not_allowed') {
    return 'no_update';
  }
  return 'failed';
}

export function normalizePlayFlowResult(
  value: string | null | undefined,
): 'accepted' | 'canceled' | 'failed' | 'unavailable' {
  if (value === 'accepted' || value === 'canceled' || value === 'unavailable') {
    return value;
  }
  return 'failed';
}
