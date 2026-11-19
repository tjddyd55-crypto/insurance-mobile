const REVIEW_TENANT_LABEL = '심사용 계정';

export function resolveStoreReviewTenantDisplayName(username?: string | null): string | null {
  const login = String(username ?? '').trim().toLowerCase();
  if (login === 'apple_review') return 'Apple App Review';
  if (login === 'google_review') return REVIEW_TENANT_LABEL;
  return null;
}

function resolveReviewGaName(gaCode?: string | null, username?: string | null): string | null {
  return resolveStoreReviewTenantDisplayName(username)
    ?? (gaCode?.trim().toUpperCase() === 'PLAY_REVIEW' ? REVIEW_TENANT_LABEL : null);
}

export function resolveDisplayGaName(
  gaName?: string | null,
  gaCode?: string | null,
  username?: string | null,
): string {
  return resolveReviewGaName(gaCode, username) ?? (gaName?.trim() ?? '');
}

export function formatGaBannerLabel(
  gaName?: string | null,
  gaCode?: string | null,
  username?: string | null,
): string {
  const reviewLabel = resolveReviewGaName(gaCode, username);
  if (reviewLabel) return reviewLabel;

  const name = String(gaName ?? '').trim();
  if (name) return /GA$/i.test(name.replace(/\s+/g, '')) ? name : `${name} GA`;

  const code = String(gaCode ?? '').trim();
  return code ? `${code} GA` : 'GA';
}
