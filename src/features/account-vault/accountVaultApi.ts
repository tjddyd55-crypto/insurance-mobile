import { ApiError, apiRequest } from '../../api/client';
import { normalizeAccountVaultRow } from './accountVaultModel';
import type { AccountCategory, AccountVaultRow } from './types';

function requireToken(token: string | null) { if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401); return token; }
function unwrapRows(value: unknown): AccountVaultRow[] { const rows = (value as { accounts?: unknown[] })?.accounts ?? []; return rows.map(normalizeAccountVaultRow).filter((row): row is AccountVaultRow => Boolean(row)); }
export async function getAccountVault(token: string | null) { return unwrapRows(await apiRequest('/api/user-insurer-accounts', { token: requireToken(token) })); }
export async function createAccountVaultRow(token: string | null, input: { category: AccountCategory; companyName: string; loginId: string; loginPassword: string }): Promise<AccountVaultRow> {
  const result = await apiRequest<{ account: unknown }>('/api/user-insurer-accounts', { method: 'POST', token: requireToken(token), body: JSON.stringify(input) });
  const row = normalizeAccountVaultRow(result.account); if (!row) throw new ApiError('저장된 계정 응답이 올바르지 않습니다.', 500); return row;
}
export async function updateAccountVaultRow(token: string | null, id: string, input: { loginId: string; loginPassword: string }): Promise<AccountVaultRow> {
  const result = await apiRequest<{ account: unknown }>(`/api/user-insurer-accounts/${encodeURIComponent(id)}`, { method: 'PATCH', token: requireToken(token), body: JSON.stringify(input) });
  const row = normalizeAccountVaultRow(result.account); if (!row) throw new ApiError('저장된 계정 응답이 올바르지 않습니다.', 500); return row;
}
export async function deleteAccountVaultRow(token: string | null, id: string): Promise<void> { await apiRequest(`/api/user-insurer-accounts/${encodeURIComponent(id)}`, { method: 'DELETE', token: requireToken(token) }); }
