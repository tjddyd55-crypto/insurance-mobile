import { ApiError, apiRequest } from '../../api/client';
import {
  normalizeCustomerRegistrationAlimtalkResult,
  type CustomerRegistrationAlimtalkResult,
} from './customerRegistrationShareModel';
import type { CustomerBusinessInfo } from './customerBusinessInfo';
import {
  customerBusinessInfoToForm,
  isCustomerBusinessInfoEmpty,
} from './customerBusinessInfo';
import { normalizeCustomer, normalizeCustomerListResponse } from './customerModel';
import type { CustomerRecord, ListCustomersResult } from './types';

export type SaveCustomerPayload = {
  name: string;
  ssn?: string;
  gender?: 'male' | 'female' | null;
  phone?: string;
  birthDate?: string;
  address?: string;
  carrier?: string;
  height?: string;
  weight?: string;
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
  businessInfo?: CustomerBusinessInfo | null;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) {
    throw new ApiError('로그인이 필요합니다.', 401);
  }
  return value;
}

export type ListCustomersOptions = {
  limit?: number;
  consultationStatus?: 'none' | 'has' | 'no_since';
  noConsultationSince?: string;
  inflowSource?: string;
  sort?: string;
};

function appendListCustomersQuery(params: URLSearchParams, options: ListCustomersOptions) {
  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }
  if (
    options.consultationStatus === 'none' ||
    options.consultationStatus === 'has' ||
    options.consultationStatus === 'no_since'
  ) {
    params.set('consultationStatus', options.consultationStatus);
  }
  const cutoff = options.noConsultationSince?.trim();
  if (cutoff) {
    params.set('noConsultationSince', cutoff);
  }
  const inflowSource = options.inflowSource?.trim();
  if (inflowSource) {
    params.set('inflowSource', inflowSource);
  }
  const sort = options.sort?.trim();
  if (sort) {
    params.set('sort', sort);
  }
}

export async function listCustomers(
  token: string | null,
  options: ListCustomersOptions = { limit: 2000 },
): Promise<ListCustomersResult> {
  const params = new URLSearchParams();
  appendListCustomersQuery(params, options);
  const query = params.toString();
  const body = await apiRequest<unknown>(`/api/customers${query ? `?${query}` : ''}`, {
    token: requireToken(token),
  });
  return normalizeCustomerListResponse(body);
}

export async function getCustomerRegistrationLink(token: string | null): Promise<string> {
  const result = await apiRequest<{ registrationUrl?: string }>('/api/agent/customer-registration/link', {
    token: requireToken(token),
  });
  const url = String(result.registrationUrl ?? '').trim();
  if (!url) throw new ApiError('고객등록 링크를 만들 수 없습니다.', 400);
  return url;
}

export type { CustomerRegistrationAlimtalkResult } from './customerRegistrationShareModel';

export async function sendCustomerRegistrationAlimtalk(
  token: string | null,
  receiver: string,
): Promise<CustomerRegistrationAlimtalkResult> {
  try {
    const data = await apiRequest<CustomerRegistrationAlimtalkResult>(
      '/api/agent/customer-registration/alimtalk',
      {
        token: requireToken(token),
        method: 'POST',
        body: JSON.stringify({ receiver }),
      },
    );
    return normalizeCustomerRegistrationAlimtalkResult(data);
  } catch (error) {
    if (error instanceof ApiError && error.data && typeof error.data === 'object') {
      const status = String((error.data as { status?: string }).status ?? '').trim();
      if (status === 'blocked' || status === 'failed') {
        return normalizeCustomerRegistrationAlimtalkResult({
          ...(error.data as CustomerRegistrationAlimtalkResult),
          status: status as CustomerRegistrationAlimtalkResult['status'],
        });
      }
    }
    throw error;
  }
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

function trimBusinessField(value: string): string {
  return String(value ?? '').trim();
}

function businessInfoMatches(
  expected: CustomerBusinessInfo,
  actual: CustomerBusinessInfo | null | undefined,
): boolean {
  const normalizedExpected = customerBusinessInfoToForm(expected);
  const normalizedActual = customerBusinessInfoToForm(actual);
  return (
    trimBusinessField(normalizedActual.representativeName) ===
      trimBusinessField(normalizedExpected.representativeName) &&
    trimBusinessField(normalizedActual.businessNumber) ===
      trimBusinessField(normalizedExpected.businessNumber) &&
    trimBusinessField(normalizedActual.businessAddress) ===
      trimBusinessField(normalizedExpected.businessAddress) &&
    trimBusinessField(normalizedActual.memo) === trimBusinessField(normalizedExpected.memo)
  );
}

/** PUT 응답에 businessInfo가 실제 반영됐는지 검증한다. */
export function assertCustomerBusinessInfoPersisted(
  sent: CustomerBusinessInfo,
  saved: CustomerRecord,
): void {
  if (businessInfoMatches(sent, saved.businessInfo)) {
    return;
  }
  const devHint = __DEV__
    ? ' 서버가 businessInfo를 저장·반환하지 않았습니다. API contract/배포 상태를 확인하세요.'
    : '';
  throw new ApiError(`사업자 정보를 저장하지 못했습니다.${devHint}`, 502);
}

/** 사업자 섹션 저장 — 서버 partial PUT 검증을 위해 name을 함께 전송한다. */
export function buildCustomerBusinessInfoUpdatePayload(
  customer: CustomerRecord,
  businessInfo: CustomerBusinessInfo,
): Partial<SaveCustomerPayload> {
  return {
    name: customer.name,
    businessInfo: isCustomerBusinessInfoEmpty(businessInfo) ? null : businessInfo,
  };
}

export async function updateCustomerBusinessInfo(
  token: string | null,
  customer: CustomerRecord,
  businessInfo: CustomerBusinessInfo,
): Promise<CustomerRecord> {
  const payload = buildCustomerBusinessInfoUpdatePayload(customer, businessInfo);
  const updated = await updateCustomer(token, customer.id, payload);
  assertCustomerBusinessInfoPersisted(businessInfo, updated);
  return updated;
}

export async function deleteCustomer(token: string | null, customerId: number): Promise<void> {
  await apiRequest<unknown>(`/api/customers/${customerId}`, {
    method: 'DELETE',
    token: requireToken(token),
  });
}
