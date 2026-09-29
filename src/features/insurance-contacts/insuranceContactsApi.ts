import { ApiError, apiRequest } from '../../api/client';
import { normalizeCompanyDirectoryEntry } from './insuranceContactsModel';
import type { CompanyDirectoryEntry } from './types';

export async function getInsuranceCompanyDirectory(token: string | null): Promise<CompanyDirectoryEntry[]> {
  if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401);
  const result = await apiRequest<unknown[]>('/api/company/list', { token });
  return result.map(normalizeCompanyDirectoryEntry).filter((entry): entry is CompanyDirectoryEntry => Boolean(entry));
}
