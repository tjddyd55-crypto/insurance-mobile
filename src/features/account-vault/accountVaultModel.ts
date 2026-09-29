import type { AccountCategory, AccountVaultRow } from './types';

export function normalizeAccountVaultRow(value: unknown): AccountVaultRow | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? '').trim();
  const category = String(row.category ?? '') as AccountCategory;
  const companyName = String(row.companyName ?? row.company_name ?? '').trim();
  if (!id || !companyName || !['LIFE', 'NON_LIFE', 'GENERAL'].includes(category)) return null;
  return { id, category, companyName, loginId: String(row.loginId ?? row.login_id ?? ''), loginPassword: String(row.loginPassword ?? row.login_password ?? ''), memo: String(row.memo ?? ''), sortOrder: Number(row.sortOrder ?? row.sort_order) || 0, isCustom: Boolean(row.isCustom ?? row.is_custom), isArchived: Boolean(row.isArchived ?? row.is_archived), updatedAt: String(row.updatedAt ?? row.updated_at ?? '') };
}

export function maskSecret(value: string): string { return value ? '•'.repeat(Math.min(Math.max(value.length, 8), 16)) : '미등록'; }
