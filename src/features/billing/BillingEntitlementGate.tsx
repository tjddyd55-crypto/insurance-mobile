import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { resolveAppEnvironment } from '../../config/environment';
import { LoadingState } from '../../components/LoadingState';
import {
  isBillingAllowedNativePath,
  isBillingUiVisibleForUser,
  isInsuranceBillingAccessEnforced,
  isInsuranceBillingEnabled,
} from './billingAccessPolicy';
import { billingCheckoutSummaryQueryKey, getCheckoutSummary } from './billingApi';
import {
  buildFeatureAccessContext,
  evaluateRouteFeatureAccess,
} from '../entitlements/featureEntitlementGuard';
import { resolveBillingStartupAccess } from './billingStartupAccess';
import { isIosCouponUiHidden, MANAGED_ACCESS_MESSAGE, MANAGED_ACCESS_PROFILE_PATH } from './iosBillingUiPolicy';

export function BillingEntitlementGate({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const environment = resolveAppEnvironment();
  const policyApplies =
    isInsuranceBillingEnabled()
    && isInsuranceBillingAccessEnforced()
    && isBillingUiVisibleForUser(user)
    && user?.role === 'USER';
  const allowedPath = isBillingAllowedNativePath(pathname);
  const summary = useQuery({
    queryKey: billingCheckoutSummaryQueryKey,
    queryFn: () => getCheckoutSummary(token),
    enabled: policyApplies && !allowedPath && Boolean(token),
    retry: 1,
  });
  const ctx = buildFeatureAccessContext(user, summary.data);
  const routeVerdict = evaluateRouteFeatureAccess(pathname, ctx).verdict;
  const featureAllowsWithoutPaid =
    routeVerdict?.allowed === true || routeVerdict?.reason === 'ga_required';

  const access = featureAllowsWithoutPaid
    ? 'allow'
    : resolveBillingStartupAccess({
      policyApplies,
      allowedPath,
      isLoading: summary.isLoading,
      isError: summary.isError,
      error: summary.error,
      summary: summary.data,
      environment,
    });

  const hideCouponUi = isIosCouponUiHidden();
  useEffect(() => {
    if (access === 'redirect_billing') {
      router.replace(hideCouponUi ? MANAGED_ACCESS_PROFILE_PATH : '/billing');
    }
  }, [access, hideCouponUi, router]);

  if (hideCouponUi && access === 'redirect_billing') {
    return <LoadingState message={MANAGED_ACCESS_MESSAGE} />;
  }
  return <>{children}</>;
}
