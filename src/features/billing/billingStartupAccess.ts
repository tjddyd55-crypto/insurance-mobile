import type { AppEnvironment } from '../../config/appIdentity';
import { ApiError } from '../../api/client';

import type { CheckoutSummary } from './types';
import { hasActiveBillingEntitlement } from './billingEntitlement';

export type BillingStartupAccessDecision = 'allow' | 'redirect_billing';

export const BILLING_UNAVAILABLE_MESSAGE = '결제단이 활성화되지 않았습니다.';

export function isBillingUnavailableError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 404) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes(BILLING_UNAVAILABLE_MESSAGE);
}

export function isBillingFetchFailureNonBlocking(
  error: unknown,
  isError: boolean,
): boolean {
  return isError && isBillingUnavailableError(error);
}

/**
 * Native startup billing gate — mirrors Web RequireInsuranceBillingEntitlement.
 * Fetch failures and payment-stage unavailability must not block CRM entry.
 */
export function resolveBillingStartupAccess(input: {
  policyApplies: boolean;
  allowedPath: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  summary: CheckoutSummary | undefined;
  environment: AppEnvironment;
}): BillingStartupAccessDecision {
  if (!input.policyApplies || input.allowedPath) {
    return 'allow';
  }

  if (isBillingFetchFailureNonBlocking(input.error, input.isError)) {
    return 'allow';
  }

  // DEV: payment stage disabled is a normal state — never block CRM entry.
  if (input.environment === 'development' && input.isError) {
    return 'allow';
  }

  // Web parity: summary fetch failed → continue into CRM.
  if (input.isError) {
    return 'allow';
  }

  // Do not block navigation while entitlement is still loading.
  if (input.isLoading && !input.summary) {
    return 'allow';
  }

  if (hasActiveBillingEntitlement(input.summary)) {
    return 'allow';
  }

  return 'redirect_billing';
}
