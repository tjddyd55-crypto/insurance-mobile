import { notificationSectionDateLabel, notificationSectionTone } from '../notificationPresentation';

describe('notificationPresentation', () => {
  test('maps section types to semantic tones without hex', () => {
    expect(notificationSectionTone('insurance_age_date')).toBe('success');
    expect(notificationSectionTone('car_expiry')).toBe('info');
    expect(notificationSectionTone('claim_request_received')).toBe('warning');
    expect(notificationSectionTone('special_date')).toBe('default');
  });

  test('keeps web date column labels', () => {
    expect(notificationSectionDateLabel('insurance_age_date')).toBe('상령일');
    expect(notificationSectionDateLabel('car_expiry')).toBe('만기일');
    expect(notificationSectionDateLabel('special_date')).toBe('지정일');
    expect(notificationSectionDateLabel('claim_request_received')).toBe('접수일');
  });
});
