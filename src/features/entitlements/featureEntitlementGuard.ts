import type { AuthUser } from '../../api/authApi';
import type { NativeMenuLink } from '../../navigation/menuConfig';
import type { CheckoutSummary } from '../billing/types';
import {
  isInsuranceBillingAccessEnforced,
  isInsuranceBillingEnabled,
} from '../billing/billingAccessPolicy';
import { hasActiveBillingEntitlement } from '../billing/billingEntitlement';
import { isIosCouponUiHidden, MANAGED_ACCESS_PROFILE_PATH } from '../billing/iosBillingUiPolicy';
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

export function resolveEntitlementMenuNavigationPath(
  item: NativeMenuLink,
  _billingSummary?: CheckoutSummary | null,
): string {
  if (!item.entitlementBlocked) {
    return item.nativePath;
  }
  if (item.entitlementReason === 'paid_required') {
    return isIosCouponUiHidden() ? MANAGED_ACCESS_PROFILE_PATH : '/billing';
  }
  if (item.entitlementReason === 'ga_required') {
    return `/public-account-restricted?from=${encodeURIComponent(item.nativePath)}`;
  }
  return item.nativePath;
}
