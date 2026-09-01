/** Keep the Native tenant chrome text identical to the operating web app. */
export function resolveStoreReviewTenantDisplayName(username?: string | null): string | null {
  const login = String(username ?? '').trim().toLowerCase();
  if (login === 'apple_review') return 'Apple App Review';
  if (login === 'google_review') return 'Google Play Review';
  return null;
}

export function formatGaBannerLabel(
  gaName?: string | null,
  gaCode?: string | null,
  username?: string | null,
): string {
  const reviewLabel = resolveStoreReviewTenantDisplayName(username);
  if (reviewLabel) return reviewLabel;

  const name = String(gaName ?? '').trim();
  if (name) return /GA$/i.test(name.replace(/\s+/g, '')) ? name : `${name} GA`;

  const code = String(gaCode ?? '').trim();
  return code ? `${code} GA` : 'GA';
}
