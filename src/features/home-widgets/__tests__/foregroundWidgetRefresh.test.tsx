import React from 'react';
import { AppState, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'authenticated', token: 't', user: { id: 1, gaId: 2 } }),
}));
jest.mock('../engine/widgetRefreshCoordinator', () => ({
  refreshWidgets: jest.fn(() => Promise.resolve()),
  purgeWidgets: jest.fn(() => Promise.resolve()),
}));

import { refreshWidgets } from '../engine/widgetRefreshCoordinator';
import { isSuppressedForegroundInvalidate, useHomeWidgetSync, WIDGET_CHANGE_DEBOUNCE_MS } from '../useHomeWidgetSync';
import { scheduleQueryKeys } from '../../schedule/queryKeys';
import { todoQueryKeys } from '../../todos/queryKeys';

describe('foreground widget refresh', () => {
  const originalOS = Platform.OS;
  let listener: ((s: string) => void) | null = null;
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      listener = cb;
      return { remove: jest.fn() };
    }) as never);
    (refreshWidgets as jest.Mock).mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
    jest.restoreAllMocks();
  });

  it('app 복귀 시 위젯 refresh 1회 (자체 invalidate 로 2차 갱신 없음)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(scheduleQueryKeys.all, []);
    client.setQueryData(todoQueryKeys.all, []);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => useHomeWidgetSync(), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(WIDGET_CHANGE_DEBOUNCE_MS * 2);
    });
    (refreshWidgets as jest.Mock).mockClear();

    await act(async () => {
      listener?.('active');
      jest.advanceTimersByTime(WIDGET_CHANGE_DEBOUNCE_MS * 3);
    });
    expect(refreshWidgets).toHaveBeenCalledTimes(1);
    expect((refreshWidgets as jest.Mock).mock.calls[0][1]).toMatchObject({ reason: 'appMutation', force: true });

    // 창이 지난 뒤의 앱 쓰기 invalidate 는 그대로 갱신된다.
    (refreshWidgets as jest.Mock).mockClear();
    client.setQueryData(todoQueryKeys.all, []);
    await act(async () => {
      jest.advanceTimersByTime(WIDGET_CHANGE_DEBOUNCE_MS * 2);
    });
    (refreshWidgets as jest.Mock).mockClear();
    await act(async () => {
      void client.invalidateQueries({ queryKey: todoQueryKeys.all });
      jest.advanceTimersByTime(WIDGET_CHANGE_DEBOUNCE_MS * 2);
    });
    expect(refreshWidgets).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('suppress 창은 invalidate 에만 적용', () => {
    expect(isSuppressedForegroundInvalidate('invalidate', 10, 20)).toBe(true);
    expect(isSuppressedForegroundInvalidate('invalidate', 20, 20)).toBe(false);
    expect(isSuppressedForegroundInvalidate('success', 10, 20)).toBe(false);
  });
});
