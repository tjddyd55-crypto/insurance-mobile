import * as Notifications from 'expo-notifications';

/** FCM default channel (matches app.config.ts expo-notifications plugin). */
export const WORK_NOTIFICATION_CHANNEL_ID = 'claim_notifications';

/**
 * Android work-alert channel. System default sound: omit `sound` — expo-notifications
 * treats any string as a custom raw resource name (`res/raw/<name>`) and logs a warning
 * when the file is missing (including the literal string "default").
 */
export function workNotificationChannelInput(): Notifications.NotificationChannelInput {
  return {
    name: '업무 알림',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250],
  };
}
