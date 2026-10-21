import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { loadCustomerPhoneIndex } from './deviceContactCustomerIndex';
import { resolveContactsPermissionPhase, type ContactsPermissionPhase } from './deviceContactPermission';
import { deviceContactStore } from './deviceContactSession';
import { readContactsPermission, readDeviceAddressBook, requestContactsPermission } from './deviceContactsSource';

export function deviceContactAccountKey(user: { id: string; gaId: number | null }): string {
  return `u:${user.id}|ga:${user.gaId ?? 0}`;
}

type RefreshKind = 'initial' | 'manual' | 'foreground';

/**
 * 권한 확인 → 주소록 1회 + 고객 인덱스 1회 → 로컬 대조.
 * 포그라운드와 새로고침만 주소록을 다시 읽는다.
 */
export function useDeviceContacts(
  user: { id: string; gaId: number | null } | null,
  token: string | null,
) {
  const accountKey = user ? deviceContactAccountKey(user) : null;
  const [phase, setPhase] = useState<ContactsPermissionPhase>('checking');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestId = useRef(0);
  const focused = useRef(false);
  const loadedAccount = useRef<string | null>(null);

  const refresh = useCallback(async (kind: RefreshKind) => {
    if (!accountKey || !token) {
      return;
    }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    if (kind === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setErrorMessage(null);
    try {
      const permission = await readContactsPermission();
      if (requestId.current !== currentRequest) {
        return;
      }
      const nextPhase = resolveContactsPermissionPhase(permission);
      setPhase(nextPhase);
      if (nextPhase !== 'granted') {
        return;
      }
      const [raw, index] = await Promise.all([
        readDeviceAddressBook(),
        loadCustomerPhoneIndex(token),
      ]);
      if (requestId.current !== currentRequest) {
        return;
      }
      deviceContactStore.publishAddressBook({
        accountKey,
        raw,
        customers: index.customers,
        customerIndexTruncated: index.truncated,
      });
    } catch {
      if (requestId.current === currentRequest) {
        setErrorMessage('연락처를 불러오지 못했습니다.');
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accountKey, token]);

  const requestAccess = useCallback(async () => {
    setErrorMessage(null);
    try {
      const permission = await requestContactsPermission();
      const nextPhase = resolveContactsPermissionPhase(permission);
      setPhase(nextPhase);
      if (nextPhase === 'granted') {
        await refresh('manual');
      }
    } catch {
      setErrorMessage('연락처 권한을 요청하지 못했습니다.');
    }
  }, [refresh]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!accountKey) {
      return undefined;
    }
    if (loadedAccount.current !== accountKey) {
      loadedAccount.current = accountKey;
      void deviceContactStore.hydrate(accountKey).finally(() => {
        void refresh('initial');
      });
    }
    return () => {
      focused.current = false;
    };
  }, [accountKey, refresh]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && focused.current) {
        void refresh('foreground');
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  return { phase, loading, refreshing, errorMessage, refresh, requestAccess };
}
