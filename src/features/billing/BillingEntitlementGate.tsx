import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { resolveAppEnvironment } from '../../config/environment';
import {
  isBillingAllowedNativePath,
  isBillingUiVisibleForUser,
  isInsuranceBillingAccessEnforced,
  isInsuranceBillingEnabled,
} from './billingAccessPolicy';
import { billingCheckoutSummaryQueryKey, getCheckoutSummary } from './billingApi';
import { resolveBillingStartupAccess } from './billingStartupAccess';

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
  const access = resolveBillingStartupAccess({
    policyApplies,
    allowedPath,
    isLoading: summary.isLoading,
    isError: summary.isError,
    error: summary.error,
    summary: summary.data,
    environment,
  });

  useEffect(() => {
    if (access === 'redirect_billing') {
      router.replace('/billing');
    }
  }, [access, router]);

  return <>{children}</>;
}
