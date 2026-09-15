import {
  DEFAULT_ALERT_DATE_PURPOSE,
  formatCustomerAlertDateLabel,
} from '../customerAlertDateDisplay';

describe('customerAlertDateDisplay', () => {
  it('uses title as label and falls back to purpose label', () => {
    expect(
      formatCustomerAlertDateLabel({ title: '자동차보험 갱신', purposeType: 'NOTICE' }),
    ).toBe('자동차보험 갱신');
    expect(formatCustomerAlertDateLabel({ title: '', purposeType: 'CELEBRATION' })).toBe('기념');
  });

  it('defaults new alert date purpose to NOTICE', () => {
    expect(DEFAULT_ALERT_DATE_PURPOSE).toBe('NOTICE');
  });
});
