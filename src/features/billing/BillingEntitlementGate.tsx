import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { LoadingState } from '../../components/LoadingState';
import {
  isBillingAllowedNativePath,
  isBillingUiVisibleForUser,
  isInsuranceBillingAccessEnforced,
  isInsuranceBillingEnabled,
} from './billingAccessPolicy';
import { billingCheckoutSummaryQueryKey, getCheckoutSummary } from './billingApi';
import { hasActiveBillingEntitlement } from './billingEntitlement';

export function BillingEntitlementGate({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
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
  });
  const entitled = hasActiveBillingEntitlement(summary.data);

  useEffect(() => {
    if (policyApplies && !allowedPath && summary.isSuccess && !entitled) {
      router.replace('/billing');
    }
  }, [allowedPath, entitled, policyApplies, router, summary.isSuccess]);

  if (!policyApplies || allowedPath || summary.isError || entitled) {
    return <>{children}</>;
  }
  return <LoadingState message="이용 권한을 확인하는 중…" />;
}
