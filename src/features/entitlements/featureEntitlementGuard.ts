import type { AuthUser } from '../../api/authApi';
import type { NativeMenuLink } from '../../navigation/menuConfig';
import type { CheckoutSummary } from '../billing/types';
import {
  isInsuranceBillingAccessEnforced,
  isInsuranceBillingEnabled,
} from '../billing/billingAccessPolicy';
import { hasActiveBillingEntitlement } from '../billing/billingEntitlement';
import {
  evaluateFeatureAccess,
  isGaMemberUser,
  type FeatureAccessContext,
  type FeatureKey,
} from './featureEntitlementPolicy';
import { resolveFeatureKeyFromPath } from './featureRoutePolicy';

export function resolveHasActivePaidAccess(
  user: AuthUser | null | undefined,
  billingSummary?: CheckoutSummary | null,
): boolean {
  if (!isInsuranceBillingEnabled() || !isInsuranceBillingAccessEnforced()) {
    return true;
  }
  if (user?.role !== 'USER') {
    return true;
  }
  if (billingSummary) {
    return hasActiveBillingEntitlement(billingSummary);
  }
  const plan = String(user?.subscription?.plan ?? '').trim().toUpperCase();
  const effective = String(user?.subscription?.effectiveStatus ?? '').trim().toUpperCase();
  if (effective === 'ACTIVE' && (plan === 'TRIAL' || plan === 'PAID')) {
    return true;
  }
  return false;
}

export function buildFeatureAccessContext(
  user: AuthUser | null | undefined,
  billingSummary?: CheckoutSummary | null,
): FeatureAccessContext {
  return {
    hasActivePaidAccess: resolveHasActivePaidAccess(user, billingSummary),
    isGaMember: isGaMemberUser(user),
  };
}

export function evaluateRouteFeatureAccess(
  pathname: string,
  ctx: FeatureAccessContext,
  options?: { newsletterBoardScope?: string | null },
) {
  const featureKey = resolveFeatureKeyFromPath(pathname, options);
  if (!featureKey) {
    return { featureKey: null, verdict: null };
  }
  return {
    featureKey,
    verdict: evaluateFeatureAccess(featureKey as FeatureKey, ctx),
  };
}

type EntitlementMenuLink = NativeMenuLink & {
  entitlementBlocked?: boolean;
  entitlementReason?: 'paid_required' | 'ga_required' | null;
};

export function resolveEntitlementMenuNavigationPath(
  item: EntitlementMenuLink,
  _billingSummary?: CheckoutSummary | null,
): string {
  if (!item.entitlementBlocked) {
    return item.nativePath;
  }
  if (item.entitlementReason === 'paid_required') {
    return '/billing';
  }
  if (item.entitlementReason === 'ga_required') {
    return `/public-account-restricted?from=${encodeURIComponent(item.nativePath)}`;
  }
  return item.nativePath;
}
