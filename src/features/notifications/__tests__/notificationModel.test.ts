import {
  groupNotifications,
  normalizeNotification,
  normalizeNotificationList,
  normalizeNotificationSettings,
  notificationDDay,
  notificationReferenceDate,
} from '../notificationModel';

describe('notificationModel', () => {
  const raw = {
    id: '5',
    type: 'car_expiry',
    message: '자동차 만기 알림',
    customer_id: 7,
    customer_name: '홍길동',
    target_date: '2026-09-03T00:00:00.000Z',
    is_read: false,
    is_dismissed: false,
  };

  test('normalizes snake_case notification fields', () => {
    const row = normalizeNotification(raw);
    expect(row.customerId).toBe(7);
    expect(row.customerName).toBe('홍길동');
    expect(row.targetDate).toBe('2026-09-03');
    expect(row.type).toBe('car_expiry');
  });

  test('normalizes list response and defaults settings', () => {
    const result = normalizeNotificationList({ notifications: [raw], settings: {} });
    expect(result.notifications).toHaveLength(1);
    expect(result.settings.insuranceAge.daysBefore).toBe(30);
  });

  test('normalizes valid settings and bounds invalid days', () => {
    const settings = normalizeNotificationSettings({
      insuranceAge: { enabled: false, daysBefore: 10 },
      carExpiry: { enabled: true, daysBefore: 999 },
      claimRequest: { enabled: false },
    });
    expect(settings.insuranceAge).toEqual({ enabled: false, daysBefore: 10 });
    expect(settings.carExpiry.daysBefore).toBe(30);
    expect(settings.claimRequest.enabled).toBe(false);
  });

  test('computes D-day labels by date-only value', () => {
    expect(notificationDDay('2026-09-03', '2026-08-31')).toBe('D-3');
    expect(notificationDDay('2026-08-31', '2026-08-31')).toBe('D-Day');
    expect(notificationDDay('2026-08-28', '2026-08-31')).toBe('D+3');
  });

  test('uses created date for claim request and groups in source order', () => {
    const claim = normalizeNotification({
      id: '6',
      type: 'claim_request_received',
      createdAt: '2026-08-31T01:00:00.000Z',
    });
    expect(notificationReferenceDate(claim)).toBe('2026-08-31');
    const groups = groupNotifications([normalizeNotification(raw), claim]);
    expect(groups.map((group) => group.type)).toEqual([
      'insurance_age_date', 'car_expiry', 'special_date', 'claim_request_received',
    ]);
    expect(groups[1].data).toHaveLength(1);
  });
});
