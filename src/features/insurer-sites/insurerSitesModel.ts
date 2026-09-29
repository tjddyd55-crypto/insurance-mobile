import { resolveApiUrl } from '../../api/client';
import type { InsurerSite, InsurerSiteCategory } from './types';

export function normalizeInsurerSite(value: unknown): InsurerSite | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  const category = String(row.category ?? '') as InsurerSiteCategory;
  const name = String(row.name ?? '').trim();
  if (!Number.isFinite(id) || !name || (category !== 'life' && category !== 'non_life')) return null;
  return {
    id, category, name,
    logoPath: String(row.logoPath ?? row.logo_path ?? '').trim(),
    salesUrl: String(row.salesUrl ?? row.sales_url ?? '').trim(),
    homepageUrl: String(row.homepageUrl ?? row.homepage_url ?? '').trim(),
    disclosureUrl: String(row.disclosureUrl ?? row.disclosure_url ?? '').trim(),
    claimUrl: String(row.claimUrl ?? row.claim_url ?? '').trim(),
    sortOrder: Number(row.sortOrder ?? row.sort_order) || 0,
    isActive: row.isActive !== false && row.is_active !== false,
  };
}

export function safeExternalUrl(raw: string | undefined | null): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export function insurerLogoUrl(logoPath: string): string | null {
  const path = logoPath.trim();
  return path.startsWith('/') && !path.startsWith('//') ? resolveApiUrl(path) : null;
}

export function insurerInitials(name: string): string {
  const chars = [...name.trim()];
  return chars.slice(0, 2).join('') || '·';
}
