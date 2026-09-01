type BillingVisibilityUser = {
  username?: string | null;
  gaCode?: string | null;
  tenantCode?: string | null;
};

const STORE_REVIEW_USERNAMES = new Set(['google_review', 'apple_review']);

function readPublicBoolean(name: string, defaultValue: boolean): boolean {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;
  return !['false', '0', 'no', 'off'].includes(raw);
}

export function isInsuranceBillingEnabled(): boolean {
  return readPublicBoolean('EXPO_PUBLIC_INSURANCE_BILLING_ENABLED', false);
}

export function isInsuranceBillingAccessEnforced(): boolean {
  return readPublicBoolean('EXPO_PUBLIC_INSURANCE_BILLING_ENFORCE_ACCESS', false);
}

export function isFreeLaunchBillingUiHidden(): boolean {
  return readPublicBoolean('EXPO_PUBLIC_FREE_LAUNCH_HIDE_BILLING_UI', false);
}

export function isStoreReviewBillingSubject(
  user: BillingVisibilityUser | null | undefined,
): boolean {
  const gaCode = String(user?.gaCode ?? '').trim().toUpperCase();
  if (gaCode === 'PLAY_REVIEW') return true;

  const tenantCode = String(user?.tenantCode ?? '').trim().toLowerCase();
  if (tenantCode === 'play_review') return true;

  const username = String(user?.username ?? '').trim().toLowerCase();
  return gaCode === '' && STORE_REVIEW_USERNAMES.has(username);
}

export function isBillingUiVisibleForUser(
  user: BillingVisibilityUser | null | undefined,
): boolean {
  const reviewAccessEnabled = readPublicBoolean(
    'EXPO_PUBLIC_BILLING_REVIEW_ACCESS_ENABLED',
    true,
  );
  if (reviewAccessEnabled && isStoreReviewBillingSubject(user)) {
    return true;
  }
  return !isFreeLaunchBillingUiHidden();
}

const BILLING_ALLOWED_NATIVE_PATHS = ['/billing', '/profile', '/feature-request'] as const;

export function isBillingAllowedNativePath(pathname: string): boolean {
  return BILLING_ALLOWED_NATIVE_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
