import * as SecureStore from 'expo-secure-store';

import { getEnvironmentConfig } from '../config/environment';

/**
 * Play Store WebView 셸(com.onefc.app) → Native 교체 시 1회 안전 초기화.
 *
 * - 고객/파일/청구 등 서버 데이터는 절대 건드리지 않는다.
 * - Legacy 세션은 WebView localStorage(`insurance.auth.session`)라
 *   Native SecureStore로 안전하게 이전할 수 없으므로 강제 재로그인을 전제로 한다.
 * - 이름만 비슷한 unscoped SecureStore 잔여 키만 제거한다.
 */
export const NATIVE_MIGRATION_VERSION = '1';

const LEGACY_TOKEN_KEY = 'onefc.auth.token';
const LEGACY_USER_META_KEY = 'onefc.auth.userMeta';

function migrationKeys() {
  const environment = getEnvironmentConfig().environment;
  return {
    version: `onefc.nativeMigrationVersion.${environment}`,
    reLoginNotice: `onefc.nativeUpgrade.reloginNotice.${environment}`,
  };
}

export type NativeUpgradeMigrationResult = {
  ran: boolean;
  requireReLoginNotice: boolean;
};

export async function ensureNativeUpgradeMigration(): Promise<NativeUpgradeMigrationResult> {
  const keys = migrationKeys();
  const current = await SecureStore.getItemAsync(keys.version);
  if (current === NATIVE_MIGRATION_VERSION) {
    return { ran: false, requireReLoginNotice: false };
  }

  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_USER_META_KEY),
  ]);
  await SecureStore.setItemAsync(keys.version, NATIVE_MIGRATION_VERSION);
  await SecureStore.setItemAsync(keys.reLoginNotice, '1');

  return { ran: true, requireReLoginNotice: true };
}

export async function consumeNativeUpgradeReLoginNotice(): Promise<boolean> {
  const { reLoginNotice } = migrationKeys();
  const raw = await SecureStore.getItemAsync(reLoginNotice);
  if (raw !== '1') {
    return false;
  }
  await SecureStore.deleteItemAsync(reLoginNotice);
  return true;
}
