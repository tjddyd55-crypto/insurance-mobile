import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';
import { LoadingState } from '../components/LoadingState';
import {
  isInsuranceBillingAccessEnforced,
  isInsuranceBillingEnabled,
} from '../features/billing/billingAccessPolicy';
import { billingCheckoutSummaryQueryKey, getCheckoutSummary } from '../features/billing/billingApi';
import {
  buildFeatureAccessContext,
  evaluateRouteFeatureAccess,
} from '../features/entitlements/featureEntitlementGuard';

export function PublicAccountAccessGate({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const policyApplies =
    isInsuranceBillingEnabled()
    && isInsuranceBillingAccessEnforced()
    && user?.role === 'USER';
  const summary = useQuery({
    queryKey: billingCheckoutSummaryQueryKey,
    queryFn: () => getCheckoutSummary(token),
    enabled: policyApplies && Boolean(token),
    retry: 1,
  });
  const ctx = buildFeatureAccessContext(user, summary.data);
  const { verdict } = evaluateRouteFeatureAccess(pathname, ctx);
  const restricted = Boolean(verdict && !verdict.allowed && verdict.reason === 'ga_required');

  useEffect(() => {
    if (restricted) {
      router.replace({
        pathname: '/public-account-restricted',
        params: { from: pathname },
      });
    }
  }, [pathname, restricted, router]);

  if (restricted) {
    return <LoadingState message="계정 권한을 확인하는 중…" />;
  }
  return <>{children}</>;
}
