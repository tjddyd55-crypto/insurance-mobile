import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from '../api/authApi';
import { getEnvironmentConfig } from '../config/environment';

const LEGACY_TOKEN_KEY = 'onefc.auth.token';
const LEGACY_USER_META_KEY = 'onefc.auth.userMeta';

function storageKeys() {
  const environment = getEnvironmentConfig().environment;
  return {
    token: `onefc.auth.${environment}.token`,
    userMeta: `onefc.auth.${environment}.userMeta`,
  };
}

export type StoredAuthSession = {
  token: string;
  user: AuthUser;
};

/** Persist JWT + minimal user metadata only. Never store password/secrets. */
export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
  const keys = storageKeys();
  const token = session.token.trim();
  if (!token) {
    throw new Error('빈 토큰은 저장할 수 없습니다.');
  }
  const meta: AuthUser = {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    gaId: session.user.gaId,
    gaCode: session.user.gaCode,
    gaName: session.user.gaName,
    companyId: session.user.companyId,
    displayName: session.user.displayName,
    teamId: session.user.teamId,
    tenantCode: session.user.tenantCode,
    subscription: session.user.subscription,
  };
  await SecureStore.setItemAsync(keys.token, token);
  await SecureStore.setItemAsync(keys.userMeta, JSON.stringify(meta));
}

export async function readAuthSession(): Promise<StoredAuthSession | null> {
  const keys = storageKeys();
  const token = await SecureStore.getItemAsync(keys.token);
  const metaRaw = await SecureStore.getItemAsync(keys.userMeta);
  if (!token?.trim() || !metaRaw) {
    return null;
  }
  try {
    const user = JSON.parse(metaRaw) as AuthUser;
    if (!user?.id || !user?.username || !user?.role) {
      return null;
    }
    return {
      token: token.trim(),
      user: {
        ...user,
        tenantCode: typeof user.tenantCode === 'string' ? user.tenantCode : '',
        subscription: user.subscription ?? null,
      },
    };
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  const keys = storageKeys();
  await Promise.all([
    SecureStore.deleteItemAsync(keys.token),
    SecureStore.deleteItemAsync(keys.userMeta),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_USER_META_KEY),
  ]);
}
