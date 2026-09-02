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
  pushPayloadFromNotification,
  registerPushDeviceWithServer,
} from './pushRegistration';

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

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (status !== 'authenticated') return;

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const responseId = String(response.notification.request.identifier ?? '');
      if (responseId && handledResponseIds.current.has(responseId)) return;
      if (responseId) handledResponseIds.current.add(responseId);

      const payload = pushPayloadFromNotification(response.notification.request.content);
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      if (tokenRef.current && payload?.notificationId) {
        void markNotificationRead(tokenRef.current, payload.notificationId).catch(() => undefined);
      }
      navigateFromPushPayload(router, payload);
    });

    const tokenSub = Notifications.addPushTokenListener((devicePushToken) => {
      const nextToken = String(devicePushToken?.data ?? '').trim();
      const authToken = tokenRef.current;
      if (!nextToken || !authToken) return;
      void registerPushDeviceWithServer({ authToken, deviceToken: nextToken });
    });

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (!last) return;
      const responseId = String(last.notification.request.identifier ?? '');
      if (responseId && handledResponseIds.current.has(responseId)) return;
      if (responseId) handledResponseIds.current.add(responseId);
      const payload = pushPayloadFromNotification(last.notification.request.content);
      navigateFromPushPayload(router, payload);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      tokenSub.remove();
    };
  }, [queryClient, router, status]);
}
