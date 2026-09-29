import { formatBillingCycle, presentBillingStatus } from '../billingPresentation';
import type { CheckoutSummary, Subscription } from '../types';

const summary: CheckoutSummary = {
  subscriptionStatus: 'active_paid',
  billingCycle: 'monthly',
  trialEndsAt: null,
  currentPeriodEnd: '2026-10-01T00:00:00.000Z',
  isEntitled: true,
  plan: null,
  referral: null,
};

describe('billingPresentation', () => {
  test('유효한 무료 이용 상태를 결제 필요로 표시하지 않는다', () => {
    expect(presentBillingStatus({
      ...summary,
      subscriptionStatus: 'trialing',
      trialEndsAt: '2026-10-01T00:00:00.000Z',
    }, null, new Date('2026-09-02T00:00:00.000Z'))).toEqual({
      label: '무료 이용 중',
      tone: 'success',
      requiresPayment: false,
    });
  });

  test('자동결제 해지 예약은 현재 이용 가능한 해지 예정 상태다', () => {
    const subscription: Subscription = {
      status: 'active_paid',
      planName: 'ONE FC',
      planCode: 'insurance_basic',
      billingCycle: 'monthly',
      autoRenewStatus: 'CANCEL_SCHEDULED',
      currentPeriodStart: '2026-09-01T00:00:00.000Z',
      currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      nextBillingAt: null,
    };

    expect(presentBillingStatus(summary, subscription)).toEqual({
      label: '해지 예정',
      tone: 'warning',
      requiresPayment: false,
    });
  });

  test('결제 필요 상태만 결제 CTA 대상이 된다', () => {
    expect(presentBillingStatus({
      ...summary,
      subscriptionStatus: 'pending_payment',
      isEntitled: false,
    }).requiresPayment).toBe(true);
  });

  test('요금제 주기를 운영 용어로 표시한다', () => {
    expect(formatBillingCycle('monthly')).toBe('월간');
    expect(formatBillingCycle('yearly')).toBe('연간');
  });
});
