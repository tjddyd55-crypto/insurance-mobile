import type { PushPayloadData } from './pushRegistration';

export const PUSH_FALLBACK_ROUTE = '/notifications' as const;

export type NativePushRoute =
  | { pathname: '/customers/[customerId]'; params: { customerId: string } }
  | {
      pathname: '/customers/[customerId]/claim-requests';
      params: { customerId: string; claimId?: string };
    }
  | {
      pathname: '/portal/newsletters';
      params: { newsletterId?: string; channel?: string };
    }
  | {
      pathname: '/portal/adjuster-news';
      params: { newsletterId?: string };
    }
  | {
      pathname: '/portal/boards/[slug]';
      params: { slug: string; newsletterId?: string };
    }
  | { pathname: '/notifications' };

function positiveId(value: string | undefined): string | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return String(n);
}

function resolveRouteFromPath(route: string): NativePushRoute | null {
  const trimmed = String(route ?? '').trim();
  if (!trimmed.startsWith('/')) return null;

  const newsletterMatch = trimmed.match(
    /^\/portal\/(?:newsletters|adjuster-news|boards\/([^/?]+))(?:\?(.+))?$/i,
  );
  if (newsletterMatch) {
    const query = new URLSearchParams(newsletterMatch[2] ?? '');
    const newsletterId = String(query.get('newsletterId') ?? '').trim();
    const boardSlug = String(newsletterMatch[1] ?? '').trim();
    if (boardSlug) {
      return {
        pathname: '/portal/boards/[slug]',
        params: {
          slug: boardSlug,
          ...(newsletterId ? { newsletterId } : {}),
        },
      };
    }
    if (/adjuster-news/i.test(trimmed)) {
      return {
        pathname: '/portal/adjuster-news',
        params: newsletterId ? { newsletterId } : {},
      };
    }
    return {
      pathname: '/portal/newsletters',
      params: {
        ...(newsletterId ? { newsletterId } : {}),
        ...(query.get('channel') ? { channel: String(query.get('channel')) } : {}),
      },
    };
  }

  const match = trimmed.match(/^\/customers\/(\d+)(?:\/claim-requests)?/i);
  const fromRoute = match?.[1] ? positiveId(match[1]) : null;
  if (fromRoute && /claim-requests/i.test(trimmed)) {
    const claimMatch = trimmed.match(/claimId=(\d+)/i);
    const fromClaim = claimMatch?.[1] ? positiveId(claimMatch[1]) : null;
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
  return null;
}

/**
 * Push payload → Native router target.
 * Invalid / unknown payload → notification list fallback.
 */
export function resolvePushDeepLink(data: PushPayloadData | null | undefined): NativePushRoute {
  if (!data) return { pathname: PUSH_FALLBACK_ROUTE };

  if (data.route) {
    const fromRoute = resolveRouteFromPath(data.route);
    if (fromRoute) return fromRoute;
  }

  const type = String(data.type ?? '').trim().toUpperCase();
  const customerId = positiveId(data.customerId);
  const claimId = positiveId(data.claimId);
  const newsletterId = String(data.newsletterId ?? '').trim();

  if (type === 'NEWSLETTER_PUBLISHED' && newsletterId) {
    const boardSlug = String(data.boardSlug ?? '').trim();
    if (boardSlug) {
      return {
        pathname: '/portal/boards/[slug]',
        params: { slug: boardSlug, newsletterId },
      };
    }
    const channel = String(data.channel ?? 'INSURER').trim().toUpperCase();
    if (channel === 'LOSS_ADJUSTER') {
      return { pathname: '/portal/adjuster-news', params: { newsletterId } };
    }
    return {
      pathname: '/portal/newsletters',
      params: {
        newsletterId,
        ...(channel ? { channel } : {}),
      },
    };
  }

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

  return { pathname: PUSH_FALLBACK_ROUTE };
}

export function navigateFromPushPayload(
  router: { push: (href: never) => void },
  data: PushPayloadData | null | undefined,
): void {
  const target = resolvePushDeepLink(data);
  router.push(target as never);
}
