import {
  groupNotifications,
  normalizeNotification,
  normalizeNotificationList,
  normalizeNotificationSettings,
  notificationDDay,
  notificationReferenceDate,
  canOpenNotification,
  notificationLeadId,
  notificationPrimaryText,
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
    expect(result.settings.appPush.enabled).toBe(true);
    expect(result.settings.newCustomer.enabled).toBe(true);
  });

  test('normalizes valid settings and bounds invalid days', () => {
    const settings = normalizeNotificationSettings({
      appPush: { enabled: false },
      newCustomer: { enabled: false },
      insuranceAge: { enabled: false, daysBefore: 10 },
      carExpiry: { enabled: true, daysBefore: 999 },
      claimRequest: { enabled: false },
    });
    expect(settings.appPush.enabled).toBe(false);
    expect(settings.newCustomer.enabled).toBe(false);
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
      'customer_created',
      'newsletter_published',
      'claim_request_received',
      'advisor_consultation_lead',
      'insurance_age_date',
      'car_expiry',
      'special_date',
    ]);
    expect(groups.find((group) => group.type === 'car_expiry')?.data).toHaveLength(1);
  });

  test('supports advisor_consultation_lead and opens the lead by reference id', () => {
    const lead = normalizeNotification({
      id: '9',
      type: 'advisor_consultation_lead',
      reference_id: '1B4E28BA-2FA1-41D2-883F-0016D3CCA427',
      message: '홍길동님의 상담 신청이 도착했습니다.',
      created_at: '2026-10-19T01:00:00.000Z',
    });
    expect(lead.type).toBe('advisor_consultation_lead');
    expect(notificationLeadId(lead)).toBe('1b4e28ba-2fa1-41d2-883f-0016d3cca427');
    expect(canOpenNotification(lead)).toBe(true);
    expect(notificationPrimaryText(lead)).toBe('상담 신청');
    expect(notificationReferenceDate(lead)).toBe('2026-10-19');
    expect(canOpenNotification({ ...lead, referenceId: 'nope' })).toBe(false);
    expect(notificationLeadId({ type: 'car_expiry', referenceId: lead.referenceId })).toBeNull();
  });

  test('skips unknown notification types instead of failing the whole list', () => {
    const result = normalizeNotificationList({
      notifications: [raw, { id: '10', type: 'future_type_from_server' }],
      settings: {},
    });
    expect(result.notifications.map((row) => row.id)).toEqual(['5']);
  });
});
