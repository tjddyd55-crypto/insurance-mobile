import { listCustomers } from '../customers/customersApi';
import { customerPhoneRefs } from './deviceContactMatch';
import type { CustomerPhoneRef } from './deviceContactTypes';

/** 기존 고객 목록 API의 상한. 오프셋이 없어 이 이상 페이지는 없다. */
export const DEVICE_CONTACT_CUSTOMER_INDEX_LIMIT = 2000;

export type CustomerPhoneIndex = {
  customers: CustomerPhoneRef[];
  truncated: boolean;
};

/**
 * 고객 전화 인덱스 1회 로드.
 * `GET /api/customers?limit=2000` 은 이미 id·name·phone 을 포함한다.
 * 연락처 수만큼 고객을 다시 조회하지 않는다.
 */
export async function loadCustomerPhoneIndex(token: string | null): Promise<CustomerPhoneIndex> {
  const result = await listCustomers(token, { limit: DEVICE_CONTACT_CUSTOMER_INDEX_LIMIT });
  const customers = result.customers.flatMap((customer) => customerPhoneRefs({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
  }));
  return {
    customers,
    truncated: result.total > result.customers.length,
  };
}
