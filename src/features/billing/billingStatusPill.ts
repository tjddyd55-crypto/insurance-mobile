import type { CheckoutSummary } from './types';

export type BillingStatusPillView = {
  label: string;
  tone: 'primary' | 'neutral' | 'warning' | 'danger';
};

function formatDotDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function buildBillingStatusPill(summary?: CheckoutSummary | null): BillingStatusPillView | null {
  if (!summary) return null;
  const status = String(summary.subscriptionStatus ?? '').trim().toLowerCase();
  if (status === 'trialing' || status === 'trial') {
    const date = formatDotDate(summary.trialEndsAt);
    return { label: date ? `무료 이용 중 · ${date}까지` : '무료 이용 중', tone: 'primary' };
  }
  if (status === 'active_paid' || status === 'paid') {
    const date = formatDotDate(summary.nextBillingAt ?? summary.currentPeriodEnd);
    return { label: date ? `유료 이용 중 · 다음 결제일 ${date}` : '유료 이용 중', tone: 'primary' };
  }
  if (status === 'legacy_active' || status === 'active' || status === 'free') {
    return { label: '기존 이용자', tone: 'neutral' };
  }
  if (status === 'past_due') return { label: '결제 확인 필요', tone: 'warning' };
  if (status === 'blocked') return { label: '이용 제한', tone: 'danger' };
  if (status === 'expired') return { label: '무료기간 종료', tone: 'danger' };
  if (status === 'pending_payment' || status === 'pending') return { label: '결제 필요', tone: 'danger' };
  return null;
}
