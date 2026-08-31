import { ApiError, apiRequest } from '../../api/client';
import { normalizeFeatureRequest, normalizeFeatureRequestComment } from './featureRequestModel';
import type { FeatureRequest, FeatureRequestComment } from './types';
function requireToken(token: string | null) { if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401); return token; }
export async function listMyFeatureRequests(token: string | null): Promise<FeatureRequest[]> { const rows = await apiRequest<unknown[]>('/api/feature-requests/my', { token: requireToken(token) }); return rows.map(normalizeFeatureRequest).filter((row): row is FeatureRequest => Boolean(row)); }
export async function submitFeatureRequest(token: string | null, input: { title: string; content: string }): Promise<void> { await apiRequest('/api/feature-request', { method: 'POST', token: requireToken(token), body: JSON.stringify({ title: input.title.trim(), content: input.content.trim() }) }); }
export async function deleteMyFeatureRequest(token: string | null, id: number): Promise<void> { await apiRequest(`/api/feature-requests/my/${id}`, { method: 'DELETE', token: requireToken(token) }); }
export async function listMyFeatureRequestComments(token: string | null, id: number): Promise<FeatureRequestComment[]> { const rows = await apiRequest<unknown[]>(`/api/feature-requests/my/${id}/comments`, { token: requireToken(token) }); return rows.map(normalizeFeatureRequestComment).filter((row): row is FeatureRequestComment => Boolean(row)); }
