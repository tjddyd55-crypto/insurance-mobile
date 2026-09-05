import { ApiError } from '../../../api/client';
import {
  BILLING_UNAVAILABLE_MESSAGE,
  isBillingUnavailableError,
  resolveBillingStartupAccess,
} from '../billingStartupAccess';
import type { CheckoutSummary } from '../types';

const summaryBase: CheckoutSummary = {
  subscriptionStatus: 'pending_payment',
  billingCycle: 'monthly',
  trialEndsAt: null,
  plan: null,
  referral: null,
};

const baseInput = {
  policyApplies: true,
  allowedPath: false,
  isLoading: false,
  isError: false,
  error: null,
  summary: undefined,
  environment: 'production' as const,
};

describe('billingStartupAccess', () => {
  test('allows CRM when billing fetch fails', () => {
    expect(
      resolveBillingStartupAccess({
        ...baseInput,
        isError: true,
        error: new Error('network'),
      }),
    ).toBe('allow');
  });

  test('allows CRM when payment stage is disabled on the server', () => {
    expect(
      resolveBillingStartupAccess({
        ...baseInput,
        isError: true,
        error: new ApiError(BILLING_UNAVAILABLE_MESSAGE, 404),
      }),
    ).toBe('allow');
  });

  test('allows DEV CRM when subscription fetch errors', () => {
    expect(
      resolveBillingStartupAccess({
        ...baseInput,
        environment: 'development',
        isError: true,
        error: new Error('temporary outage'),
      }),
    ).toBe('allow');
  });

  test('allows CRM while subscription summary is loading', () => {
    expect(
      resolveBillingStartupAccess({
        ...baseInput,
        isLoading: true,
      }),
    ).toBe('allow');
  });

  test('redirects only when billing is available and user is not entitled', () => {
    expect(
      resolveBillingStartupAccess({
        ...baseInput,
        summary: { ...summaryBase, subscriptionStatus: 'pending_payment' },
      }),
    ).toBe('redirect_billing');
  });

  test('allows entitled subscriptions', () => {
    expect(
      resolveBillingStartupAccess({
        ...baseInput,
        summary: { ...summaryBase, subscriptionStatus: 'active_paid', isEntitled: true },
      }),
    ).toBe('allow');
  });

  test('detects billing unavailable API errors', () => {
    expect(isBillingUnavailableError(new ApiError(BILLING_UNAVAILABLE_MESSAGE, 404))).toBe(
      true,
    );
    expect(isBillingUnavailableError(new Error('other'))).toBe(false);
  });
});
