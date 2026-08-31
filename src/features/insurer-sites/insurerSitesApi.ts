import { ApiError, apiRequest } from '../../api/client';
import { normalizeInsurerSite } from './insurerSitesModel';
import type { InsurerSite, InsurerSiteCategory } from './types';

export async function getInsurerSites(token: string | null, category: InsurerSiteCategory): Promise<InsurerSite[]> {
  if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401);
  const result = await apiRequest<{ items?: unknown[] }>(`/api/insurer-sites?category=${category}`, { token });
  return (result.items ?? []).map(normalizeInsurerSite).filter((site): site is InsurerSite => Boolean(site));
}
