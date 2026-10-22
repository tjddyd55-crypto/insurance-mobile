import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { purgeWidgets, refreshWidgets, type WidgetSession } from './engine/widgetRefreshCoordinator';
import { widgetTypesWatching } from './engine/widgetRegistry';
import type { WidgetRefreshReason, WidgetType } from './engine/widgetTypes';

/** 쓰기 직후 연속 이벤트를 한 번으로 묶는다. */
export const WIDGET_CHANGE_DEBOUNCE_MS = 1_500;

/**
 * 앱 쪽 트리거: 로그인/계정 변경, 앱 복귀, 앱 쓰기(뮤테이션), 일정 새로고침·Google 재연결(setQueryData).
 * 로그아웃이면 Registry 기반 전체 purge. AuthProvider 안에서 한 번만 마운트.
 */
export function useHomeWidgetSync(): void {
  const { status, token, user } = useAuth();
  const queryClient = useQueryClient();
  const sessionRef = useRef<WidgetSession | null>(null);
  const pending = useRef<{ reason: WidgetRefreshReason; types: Set<WidgetType> | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountKey = user ? `${user.id}|${user.gaId}` : '';
  const previousAccount = useRef<string>('');

  useEffect(() => {
    sessionRef.current = status === 'authenticated' && token && user ? { token, user } : null;
  }, [status, token, user]);

  useEffect(() => {
    if (Platform.OS !== 'android' || status === 'booting') return;
    if (status === 'anonymous' || !token || !user) {
      previousAccount.current = '';
      void purgeWidgets('logged_out');
      return;
    }
    const reason: WidgetRefreshReason = previousAccount.current && previousAccount.current !== accountKey ? 'accountChanged' : 'login';
    previousAccount.current = accountKey;
    void refreshWidgets({ token, user }, { reason });
    // 로그인 상태·계정이 바뀔 때만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, accountKey]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const schedule = (reason: WidgetRefreshReason, types: WidgetType[] | null) => {
      if (!sessionRef.current) return;
      const current = pending.current;
      // 같은 묶음 안에서는 더 강한 사유(appMutation)를 유지하고 대상 위젯을 합친다.
      const merged = current?.types && types ? new Set([...current.types, ...types]) : null;
      pending.current = { reason: current?.reason === 'appMutation' ? 'appMutation' : reason, types: current ? merged : types ? new Set(types) : null };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const next = pending.current;
        pending.current = null;
        timer.current = null;
        if (next) void refreshWidgets(sessionRef.current, { reason: next.reason, widgetTypes: next.types ? [...next.types] : undefined });
      }, WIDGET_CHANGE_DEBOUNCE_MS);
    };
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule('appForeground', null);
    });
    // 앱 쓰기 → 위젯 데이터가 바뀐 경우만 즉시 갱신: 위젯이 보는 쿼리 키(schedule·todos)가 무효화되었거나
    // 뮤테이션에 그 키가 mutationKey 로 붙은 경우. 업로드·알림 읽음·SMS·고객 수정 등 무관한 뮤테이션은 무시.
    const mutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      const types = widgetTypesForMutationKey(event.mutation.options.mutationKey);
      if (types.length) schedule('appMutation', types);
    });
    // setQueryData(manual) = 일정 새로고침·Google 재연결 후 다시 읽기. 일반 조회 성공은 루프 방지를 위해 무시.
    const queries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const change = widgetChangeForQueryAction(event.action.type, 'manual' in event.action ? Boolean(event.action.manual) : false);
      if (!change) return;
      const types = widgetTypesWatching(event.query.queryKey[0]);
      if (types.length) schedule(change, types);
    });
    return () => {
      appState.remove();
      mutations();
      queries();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [queryClient]);
}

/** 쿼리 캐시 이벤트 → 위젯 갱신 사유. invalidate = 앱 쓰기 후 무효화, manual success = 새로고침·Google 재연결. */
export function widgetChangeForQueryAction(actionType: string, manual: boolean): WidgetRefreshReason | null {
  if (actionType === 'invalidate') return 'appMutation';
  if (actionType === 'success' && manual) return 'googleReconnect';
  return null;
}

/** 명시적으로 위젯 데이터 키를 mutationKey 로 단 뮤테이션만. 키 없는 뮤테이션은 [] (갱신 안 함). */
export function widgetTypesForMutationKey(mutationKey: readonly unknown[] | undefined): WidgetType[] {
  return mutationKey?.length ? widgetTypesWatching(mutationKey[0]) : [];
}

export function HomeWidgetSyncLifecycle(): null {
  useHomeWidgetSync();
  return null;
}
