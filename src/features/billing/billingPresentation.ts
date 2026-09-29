import type { BadgeTone } from '../../design-system';
import type { BillingCycle, CheckoutSummary, Subscription } from './types';
import { evaluateBillingEntitlement } from './billingEntitlement';

export type BillingStatusPresentation = {
  label: string;
  tone: BadgeTone;
  requiresPayment: boolean;
};

const PAYMENT_REQUIRED_STATUSES = new Set([
  'pending',
  'pending_payment',
  'expired',
  'canceled',
  'cancelled',
  'inactive',
]);

export function formatBillingCycle(cycle?: BillingCycle | null): string {
  return cycle === 'yearly' ? '연간' : '월간';
}

export function presentBillingStatus(
  summary: CheckoutSummary,
  subscription?: Subscription | null,
  now: Date = new Date(),
): BillingStatusPresentation {
  const status = String(subscription?.status ?? summary.subscriptionStatus ?? '')
    .trim()
    .toLowerCase();
  const entitled = evaluateBillingEntitlement(summary, now).entitled;

  if (
    status === 'active_paid'
    && subscription?.autoRenewStatus === 'CANCEL_SCHEDULED'
    && entitled
  ) {
    return { label: '해지 예정', tone: 'warning', requiresPayment: false };
  }
  if ((status === 'trialing' || status === 'trial') && entitled) {
    return { label: '무료 이용 중', tone: 'success', requiresPayment: false };
  }
  if ((status === 'active_paid' || status === 'paid') && entitled) {
    return { label: '유료 이용 중', tone: 'success', requiresPayment: false };
  }
  if (status === 'past_due') {
    return { label: '결제 확인 필요', tone: 'warning', requiresPayment: true };
  }
  if (status === 'blocked') {
    return { label: '이용 제한', tone: 'danger', requiresPayment: true };
  }
  if (status === 'expired' || ((status === 'trialing' || status === 'trial') && !entitled)) {
    return { label: '무료기간 종료', tone: 'danger', requiresPayment: true };
  }
  if (PAYMENT_REQUIRED_STATUSES.has(status) || !entitled) {
    return { label: '결제 필요', tone: 'danger', requiresPayment: true };
  }
  return { label: '기존 이용자', tone: 'default', requiresPayment: false };
}
