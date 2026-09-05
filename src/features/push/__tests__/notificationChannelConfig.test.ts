import {
  WORK_NOTIFICATION_CHANNEL_ID,
  workNotificationChannelInput,
} from '../notificationChannelConfig';

describe('notificationChannelConfig', () => {
  test('uses claim_notifications as the FCM default channel id', () => {
    expect(WORK_NOTIFICATION_CHANNEL_ID).toBe('claim_notifications');
  });

  test('omits sound so Android uses the system default without a missing raw resource warning', () => {
    const channel = workNotificationChannelInput();
    expect(channel).not.toHaveProperty('sound');
    expect(channel.name).toBe('업무 알림');
    expect(channel.vibrationPattern).toEqual([0, 250]);
  });
});
