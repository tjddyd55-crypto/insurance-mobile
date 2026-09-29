import { ApiError, apiRequest } from '../../api/client';
import { normalizeCustomer } from '../customers/customerModel';
import type { CustomerRecord } from '../customers/types';

/**
 * Web SSOT: GET /api/customers/search
 * WIP customersApi에 넣지 않고 신청서 등 picker 전용으로 분리.
 */
export async function searchCustomers(
  token: string | null,
  q: string,
  options?: { limit?: number },
): Promise<CustomerRecord[]> {
  const auth = token?.trim();
  if (!auth) throw new ApiError('로그인이 필요합니다.', 401);
  const query = new URLSearchParams();
  const trimmed = q.trim();
  if (trimmed) query.set('q', trimmed);
  const limit = options?.limit;
  query.set(
    'limit',
    String(
      limit != null && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20,
    ),
  );
  const rows = await apiRequest<unknown>(`/api/customers/search?${query}`, {
    token: auth,
  });
  if (!Array.isArray(rows)) {
    throw new ApiError('고객 검색 응답 형식이 올바르지 않습니다.', 500);
  }
  return rows.map((row, index) =>
    normalizeCustomer(row, `고객 검색 ${index + 1}번째 항목`),
  );
}
