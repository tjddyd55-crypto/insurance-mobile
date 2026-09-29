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

  test('does not label an expired trial as free use', () => {
    expect(buildBillingStatusPill({
      subscriptionStatus: 'trialing',
      billingCycle: 'monthly',
      trialEndsAt: '2026-09-21T00:00:00.000Z',
      plan: null,
      referral: null,
    }, new Date('2026-09-21T15:00:00.000Z'))).toEqual({
      label: '무료기간 종료',
      tone: 'danger',
    });
  });
});
