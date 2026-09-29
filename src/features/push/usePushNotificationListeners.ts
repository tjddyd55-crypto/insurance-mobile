import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { markNotificationRead } from '../notifications/notificationsApi';
import { notificationQueryKeys } from '../notifications/queryKeys';
import { navigateFromPushPayload } from './pushDeepLink';
import {
  consumePendingPushPayload,
  stashPendingPushPayload,
} from './pendingPushNavigation';
import {
  pushPayloadFromNotification,
  registerPushDeviceWithServer,
} from './pushRegistration';

function isPushSupportedPlatform(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function handleNotificationOpen(params: {
  payload: ReturnType<typeof pushPayloadFromNotification>;
  authToken: string | null;
  isAuthenticated: boolean;
  router: ReturnType<typeof useRouter>;
  queryClient: ReturnType<typeof useQueryClient>;
}): void {
  const { payload, authToken, isAuthenticated, router, queryClient } = params;
  if (!payload) return;

  void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
  if (authToken && payload.notificationId) {
    void markNotificationRead(authToken, payload.notificationId).catch(() => undefined);
  }

  if (!isAuthenticated) {
    stashPendingPushPayload(payload);
    return;
  }

  navigateFromPushPayload(router, payload);
}

/**
 * Foreground receive → invalidate notification center.
 * Notification tap (bg/killed/fg) → deep link.
 * Token refresh → backend update.
 */
export function usePushNotificationListeners() {
  const { status, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const handledResponseIds = useRef(new Set<string>());
  const tokenRef = useRef(token);
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (!isPushSupportedPlatform()) return;

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (!last) return;
      const responseId = String(last.notification.request.identifier ?? '');
      if (responseId && handledResponseIds.current.has(responseId)) return;
      if (responseId) handledResponseIds.current.add(responseId);
      const payload = pushPayloadFromNotification(last.notification.request.content);
      handleNotificationOpen({
        payload,
        authToken: tokenRef.current,
        isAuthenticated,
        router,
        queryClient,
      });
    });
  }, [isAuthenticated, queryClient, router]);

  useEffect(() => {
    if (!isPushSupportedPlatform()) return;
    if (!isAuthenticated) return;

    const pending = consumePendingPushPayload();
    if (pending) {
      navigateFromPushPayload(router, pending);
    }

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const responseId = String(response.notification.request.identifier ?? '');
      if (responseId && handledResponseIds.current.has(responseId)) return;
      if (responseId) handledResponseIds.current.add(responseId);

      const payload = pushPayloadFromNotification(response.notification.request.content);
      handleNotificationOpen({
        payload,
        authToken: tokenRef.current,
        isAuthenticated: true,
        router,
        queryClient,
      });
    });

    const tokenSub = Notifications.addPushTokenListener((devicePushToken) => {
      const nextToken = String(devicePushToken?.data ?? '').trim();
      const authToken = tokenRef.current;
      if (!nextToken || !authToken) return;
      void registerPushDeviceWithServer({ authToken, deviceToken: nextToken });
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      tokenSub.remove();
    };
  }, [isAuthenticated, queryClient, router]);
}
