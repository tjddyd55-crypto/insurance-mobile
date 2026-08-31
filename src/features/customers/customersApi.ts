import { ApiError, apiRequest } from '../../api/client';
import { normalizeCustomer, normalizeCustomerListResponse } from './customerModel';
import type { CustomerRecord, ListCustomersResult } from './types';

export type SaveCustomerPayload = {
  name: string;
  ssn?: string;
  gender?: 'male' | 'female' | null;
  phone?: string;
  birthDate?: string;
  address?: string;
  job?: string;
  isDriver?: boolean | null;
  carType?: string;
  carNumber?: string;
  carModel?: string;
  carYear?: string;
  renewalDate?: string;
  notes?: CustomerRecord['notes'];
  isFavorite?: boolean;
  smsOptOut?: boolean;
  inflowSource?: string | null;
  referrerName?: string | null;
};

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

export async function createCustomer(
  token: string | null,
  payload: SaveCustomerPayload,
): Promise<CustomerRecord> {
  const body = await apiRequest<unknown>('/api/customers', {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify(payload),
  });
  return normalizeCustomer(body, '고객 등록');
}

export async function updateCustomer(
  token: string | null,
  customerId: number,
  payload: Partial<SaveCustomerPayload>,
): Promise<CustomerRecord> {
  const body = await apiRequest<unknown>(`/api/customers/${customerId}`, {
    method: 'PUT',
    token: requireToken(token),
    body: JSON.stringify(payload),
  });
  return normalizeCustomer(body, '고객 수정');
}

export async function deleteCustomer(token: string | null, customerId: number): Promise<void> {
  await apiRequest<unknown>(`/api/customers/${customerId}`, {
    method: 'DELETE',
    token: requireToken(token),
  });
}
