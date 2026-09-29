export type BillingEntitlementInput = {
  subscriptionStatus?: string | null;
  status?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  isEntitled?: boolean;
};

export type BillingEntitlementVerdict = {
  entitled: boolean;
  reason: string;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const ENTITLED_STATUSES = new Set([
  'active_paid',
  'active_manual',
  'legacy_active',
  'active',
  'paid',
  'free',
]);

const TRIAL_STATUSES = new Set(['trialing', 'trial']);

function toKstDateKey(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value).trim());
  if (Number.isNaN(date.getTime())) return null;
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTrialPeriodActiveKst(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const endKey = toKstDateKey(trialEndsAt);
  const todayKey = toKstDateKey(now);
  return Boolean(endKey && todayKey && endKey >= todayKey);
}

export function evaluateBillingEntitlement(
  input: BillingEntitlementInput | null | undefined,
  now: Date = new Date(),
): BillingEntitlementVerdict {
  if (input?.isEntitled === true) {
    return { entitled: true, reason: 'server_is_entitled' };
  }
  if (input?.isEntitled === false) {
    return { entitled: false, reason: 'server_not_entitled' };
  }

  const status = String(input?.subscriptionStatus ?? input?.status ?? '')
    .trim()
    .toLowerCase();
  if (!status) {
    return { entitled: false, reason: 'status_missing' };
  }
  if (ENTITLED_STATUSES.has(status)) {
    return { entitled: true, reason: status };
  }
  if (!TRIAL_STATUSES.has(status)) {
    return { entitled: false, reason: status };
  }

  const trialEndsAt = input?.trialEndsAt ?? input?.currentPeriodEnd ?? null;
  return isTrialPeriodActiveKst(trialEndsAt, now)
    ? { entitled: true, reason: 'trial_active' }
    : { entitled: false, reason: 'trial_expired' };
}

export function hasActiveBillingEntitlement(
  input: BillingEntitlementInput | null | undefined,
  now?: Date,
): boolean {
  return evaluateBillingEntitlement(input, now).entitled;
}
