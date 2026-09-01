import type { CheckoutSummary } from './types';
import { presentBillingStatus } from './billingPresentation';

export type BillingStatusPillView = {
  label: string;
  tone: 'primary' | 'neutral' | 'warning' | 'danger';
};

function formatDotDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function buildBillingStatusPill(
  summary?: CheckoutSummary | null,
  now: Date = new Date(),
): BillingStatusPillView | null {
  if (!summary) return null;
  const status = String(summary.subscriptionStatus ?? '').trim().toLowerCase();
  const presentation = presentBillingStatus(summary, null, now);
  const tone: BillingStatusPillView['tone'] = presentation.tone === 'success'
    ? 'primary'
    : presentation.tone === 'default'
      ? 'neutral'
      : presentation.tone === 'info'
        ? 'neutral'
        : presentation.tone;
  if (status === 'trialing' || status === 'trial') {
    if (presentation.requiresPayment) return { label: presentation.label, tone };
    const date = formatDotDate(summary.trialEndsAt);
    return { label: date ? `${presentation.label} · ${date}까지` : presentation.label, tone };
  }
  if (status === 'active_paid' || status === 'paid') {
    if (presentation.requiresPayment) return { label: presentation.label, tone };
    const date = formatDotDate(summary.nextBillingAt ?? summary.currentPeriodEnd);
    return { label: date ? `${presentation.label} · 다음 결제일 ${date}` : presentation.label, tone };
  }
  return { label: presentation.label, tone };
}
