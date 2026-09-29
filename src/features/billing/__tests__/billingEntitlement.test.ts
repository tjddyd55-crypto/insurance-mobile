import {
  evaluateBillingEntitlement,
  hasActiveBillingEntitlement,
  isTrialPeriodActiveKst,
} from '../billingEntitlement';

describe('billing entitlement', () => {
  const activeTrial = {
    subscriptionStatus: 'trialing',
    trialEndsAt: '2026-09-21T00:00:00.000Z',
  };

  test('uses an explicit server entitlement before local fallback', () => {
    expect(hasActiveBillingEntitlement({
      ...activeTrial,
      trialEndsAt: '2020-01-01T00:00:00.000Z',
      isEntitled: true,
    })).toBe(true);
    expect(hasActiveBillingEntitlement({
      subscriptionStatus: 'active_paid',
      isEntitled: false,
    })).toBe(false);
  });

  test.each(['active_paid', 'paid', 'active_manual', 'legacy_active', 'active', 'free'])(
    'allows entitled status %s when the server field is absent',
    (subscriptionStatus) => {
      expect(hasActiveBillingEntitlement({ subscriptionStatus })).toBe(true);
    },
  );

  test('allows a valid trial without requiring billing credentials', () => {
    expect(hasActiveBillingEntitlement(
      activeTrial,
      new Date('2026-09-21T14:59:59.000Z'),
    )).toBe(true);
  });

  test('rejects an expired trial and pending payment', () => {
    expect(evaluateBillingEntitlement(
      activeTrial,
      new Date('2026-09-21T15:00:00.000Z'),
    )).toEqual({ entitled: false, reason: 'trial_expired' });
    expect(hasActiveBillingEntitlement({ subscriptionStatus: 'pending_payment' })).toBe(false);
  });

  test('uses current period end when a trial end is absent', () => {
    expect(hasActiveBillingEntitlement({
      subscriptionStatus: 'trialing',
      currentPeriodEnd: '2026-09-21T00:00:00.000Z',
    }, new Date('2026-09-21T10:00:00.000Z'))).toBe(true);
  });

  test('keeps cancel-scheduled active paid subscriptions entitled', () => {
    expect(hasActiveBillingEntitlement({
      subscriptionStatus: 'active_paid',
      currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    })).toBe(true);
  });

  test('uses an inclusive KST calendar-day boundary', () => {
    const trialEnd = '2026-09-21T00:00:00.000Z';
    expect(isTrialPeriodActiveKst(
      trialEnd,
      new Date('2026-09-21T14:59:59.000Z'),
    )).toBe(true);
    expect(isTrialPeriodActiveKst(
      trialEnd,
      new Date('2026-09-21T15:00:00.000Z'),
    )).toBe(false);
  });
});
