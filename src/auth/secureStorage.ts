import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from '../api/authApi';

const TOKEN_KEY = 'onefc.auth.token';
const USER_META_KEY = 'onefc.auth.userMeta';

export type StoredAuthSession = {
  token: string;
  user: AuthUser;
};

/** Persist JWT + minimal user metadata only. Never store password/secrets. */
export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
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
  };
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_META_KEY, JSON.stringify(meta));
}

export async function readAuthSession(): Promise<StoredAuthSession | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const metaRaw = await SecureStore.getItemAsync(USER_META_KEY);
  if (!token?.trim() || !metaRaw) {
    return null;
  }
  try {
    const user = JSON.parse(metaRaw) as AuthUser;
    if (!user?.id || !user?.username || !user?.role) {
      return null;
    }
    return { token: token.trim(), user };
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_META_KEY);
}
