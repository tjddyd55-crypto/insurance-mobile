import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { scheduleQueryKeys } from '../schedule/queryKeys';
import { todoQueryKeys } from '../todos/queryKeys';
import { purgeHomeWidgets, syncHomeWidgets, type WidgetSyncReason } from './widgetSync';

/** 쓰기 직후 연속 이벤트를 한 번으로 묶는다. */
export const WIDGET_CHANGE_DEBOUNCE_MS = 1_500;

function touchesWidgetData(queryKey: readonly unknown[] | undefined): boolean {
  const head = queryKey?.[0];
  return head === scheduleQueryKeys.all[0] || head === todoQueryKeys.all[0];
}

/**
 * 로그인·앱 복귀·일정/할 일 변경 후 위젯을 갱신하고, 로그아웃이면 지운다.
 * AuthProvider 안에서 한 번만 마운트한다.
 */
export function useHomeWidgetSync(): void {
  const { status, token, user } = useAuth();
  const queryClient = useQueryClient();
  const sessionRef = useRef<{ token: string; user: { id: string; gaId: number } } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountKey = user ? `${user.id}|${user.gaId}` : '';

  useEffect(() => {
    sessionRef.current = status === 'authenticated' && token && user ? { token, user } : null;
  }, [status, token, user]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (status === 'booting') return;
    if (status === 'anonymous' || !token || !user) {
      void purgeHomeWidgets('logged_out');
      return;
    }
    void syncHomeWidgets({ token, user }, 'login');
    // 계정·로그인 상태가 바뀔 때만(토큰 객체 재생성마다 아님).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, accountKey]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const schedule = (reason: WidgetSyncReason) => {
      if (!sessionRef.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void syncHomeWidgets(sessionRef.current, reason, { force: reason === 'app_change' });
      }, WIDGET_CHANGE_DEBOUNCE_MS);
    };
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') schedule('foreground');
    });
    // 일정/할 일 생성·수정·삭제·완료(뮤테이션 성공) → 즉시 반영.
    const mutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') schedule('app_change');
    });
    // 일정 새로고침·Google 연결 후 다시 읽기(setQueryData 포함)·할 일 목록 갱신 → 최소 간격 안에서 반영.
    const queries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success' && touchesWidgetData(event.query.queryKey)) schedule('foreground');
    });
    return () => {
      appState.remove();
      mutations();
      queries();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [queryClient]);
}

export function HomeWidgetSyncLifecycle(): null {
  useHomeWidgetSync();
  return null;
}
