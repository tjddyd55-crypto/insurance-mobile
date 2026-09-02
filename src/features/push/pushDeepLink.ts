import type { PushPayloadData } from './pushRegistration';

export const PUSH_FALLBACK_ROUTE = '/notifications' as const;

export type NativePushRoute =
  | { pathname: '/customers/[customerId]'; params: { customerId: string } }
  | {
      pathname: '/customers/[customerId]/claim-requests';
      params: { customerId: string; claimId?: string };
    }
  | { pathname: '/notifications' };

function positiveId(value: string | undefined): string | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return String(n);
}

/**
 * Push payload → Native router target.
 * Invalid / unknown payload → notification list fallback.
 */
export function resolvePushDeepLink(data: PushPayloadData | null | undefined): NativePushRoute {
  if (!data) return { pathname: PUSH_FALLBACK_ROUTE };

  const type = String(data.type ?? '').trim().toUpperCase();
  const customerId = positiveId(data.customerId);
  const claimId = positiveId(data.claimId);

  if (
    type === 'CLAIM_CREATED' ||
    type === 'CUSTOMER_CLAIM_SUBMITTED' ||
    type === 'CUSTOMER_FILE_CREATED' ||
    type === 'CUSTOMER_INQUIRY_CREATED'
  ) {
    if (!customerId) return { pathname: PUSH_FALLBACK_ROUTE };
    return {
      pathname: '/customers/[customerId]/claim-requests',
      params: {
        customerId,
        ...(claimId ? { claimId } : {}),
      },
    };
  }

  if (type === 'CUSTOMER_CREATED') {
    if (!customerId) return { pathname: PUSH_FALLBACK_ROUTE };
    return {
      pathname: '/customers/[customerId]',
      params: { customerId },
    };
  }

  if (data.route?.startsWith('/customers/')) {
    const match = data.route.match(/^\/customers\/(\d+)(?:\/claim-requests)?/i);
    const fromRoute = match?.[1] ? positiveId(match[1]) : null;
    if (fromRoute && /claim-requests/i.test(data.route)) {
      const claimMatch = data.route.match(/claimId=(\d+)/i);
      const fromClaim = claimMatch?.[1] ? positiveId(claimMatch[1]) : claimId;
      return {
        pathname: '/customers/[customerId]/claim-requests',
        params: {
          customerId: fromRoute,
          ...(fromClaim ? { claimId: fromClaim } : {}),
        },
      };
    }
    if (fromRoute) {
      return { pathname: '/customers/[customerId]', params: { customerId: fromRoute } };
    }
  }

  return { pathname: PUSH_FALLBACK_ROUTE };
}

export function navigateFromPushPayload(
  router: { push: (href: never) => void },
  data: PushPayloadData | null | undefined,
): void {
  const target = resolvePushDeepLink(data);
  // expo-router typed routes — cast at the boundary after payload validation
  router.push(target as never);
}
