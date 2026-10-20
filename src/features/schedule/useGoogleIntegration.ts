import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { describeApiError } from '../../api/apiErrorCopy';
import { useAuth } from '../../auth/AuthProvider';
import { getEnvironmentConfig } from '../../config/environment';
import { fetchScheduleEvents, startGoogleConnectFromApp } from './scheduleApi';
import { googleConnectResultMessage, monthRange, seoulYmd } from './scheduleModel';
import { scheduleQueryKeys } from './queryKeys';
import type { GoogleConnectPurpose, ScheduleEventsResult } from './types';

/** 이번 달 일정 조회 범위. 일정 화면 첫 화면과 같은 query key 라 Google 상태 캐시를 공유한다. */
export function currentMonthScheduleRange(): { from: string; to: string } {
  return monthRange(`${seoulYmd().slice(0, 7)}-01`);
}

/**
 * Google 연동(t402u) — 연결·재연결·쓰기 권한·상태 새로고침의 유일한 구현.
 * 상태는 서버 GET /api/schedule/events 의 google 블록(SSOT). OAuth 는 서버 connect 시작 →
 * 시스템 브라우저 인증 세션(openAuthSessionAsync, WebView 아님) → <scheme>://google-connect 로 이 화면에 돌아온다.
 * 끝나면(성공·취소 모두) refresh=1 로 다시 읽고, 일정 캐시도 무효화해 일정 화면이 새 상태를 본다.
 */
export function useGoogleIntegration() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [range] = useState(currentMonthScheduleRange);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const key = scheduleQueryKeys.range(range.from, range.to);
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchScheduleEvents(token, range),
    enabled: Boolean(token),
  });

  const reload = async (): Promise<ScheduleEventsResult | null> => {
    try {
      const next = await fetchScheduleEvents(token, { ...range, refresh: true });
      queryClient.setQueryData(key, next);
      await queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all, refetchType: 'none' });
      return next;
    } catch {
      // 새로고침 간격 제한(429) 등: 일반 재조회로 대신한다.
      await queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all });
      return null;
    }
  };

  const connect = async (purpose: GoogleConnectPurpose) => {
    if (connecting) return;
    setConnecting(true);
    setMessage(null);
    try {
      const started = await startGoogleConnectFromApp(token, purpose, getEnvironmentConfig().scheme);
      const result = await WebBrowser.openAuthSessionAsync(started.url, started.returnUrl);
      setMessage(googleConnectResultMessage(result));
    } catch (error) {
      setMessage({ ok: false, text: describeApiError(error, 'Google 연결을 시작하지 못했습니다.') });
    } finally {
      setConnecting(false);
      await reload();
    }
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setMessage(null);
    try {
      const next = await reload();
      if (!next) setMessage({ ok: false, text: '잠시 후 다시 새로고침해 주세요.' });
    } finally {
      setRefreshing(false);
    }
  };

  return { query, google: query.data?.google ?? null, connect, connecting, refresh, refreshing, message };
}
