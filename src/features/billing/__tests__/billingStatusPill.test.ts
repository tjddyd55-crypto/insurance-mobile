import { buildBillingStatusPill } from '../billingStatusPill';

describe('billingStatusPill', () => {
  test('matches the legacy paid subscription header copy', () => {
    expect(buildBillingStatusPill({
      subscriptionStatus: 'active_paid',
      billingCycle: 'monthly',
      trialEndsAt: null,
      nextBillingAt: '2026-09-26T00:00:00.000Z',
      plan: null,
      referral: null,
    })).toEqual({ label: '유료 이용 중 · 다음 결제일 2026.09.26', tone: 'primary' });
  });

  test('maps required-payment states to the legacy danger pill', () => {
    expect(buildBillingStatusPill({
      subscriptionStatus: 'pending_payment',
      billingCycle: 'monthly',
      trialEndsAt: null,
      plan: null,
      referral: null,
    })).toEqual({ label: '결제 필요', tone: 'danger' });
  });
});
