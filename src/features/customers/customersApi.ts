import { ApiError, apiRequest } from '../../api/client';
import { normalizeCustomer, normalizeCustomerListResponse } from './customerModel';
import type { CustomerRecord, ListCustomersResult } from './types';

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) {
    throw new ApiError('로그인이 필요합니다.', 401);
  }
  return value;
}

export async function listCustomers(token: string | null, limit = 500): Promise<ListCustomersResult> {
  const body = await apiRequest<unknown>(`/api/customers?limit=${limit}`, {
    token: requireToken(token),
  });
  return normalizeCustomerListResponse(body);
}

export async function getCustomer(token: string | null, customerId: number): Promise<CustomerRecord> {
  const body = await apiRequest<unknown>(`/api/customers/${customerId}`, {
    token: requireToken(token),
  });
  return normalizeCustomer(body, '고객 상세');
}

export async function setCustomerFavorite(
  token: string | null,
  customerId: number,
  isFavorite: boolean,
): Promise<CustomerRecord> {
  const body = await apiRequest<unknown>(`/api/customers/${customerId}`, {
    method: 'PUT',
    token: requireToken(token),
    body: JSON.stringify({ isFavorite }),
  });
  return normalizeCustomer(body, '고객 즐겨찾기 수정');
}
