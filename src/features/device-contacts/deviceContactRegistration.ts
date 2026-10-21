import { cloneCustomerFormState } from '../customers/customerFormDraft';
import { EMPTY_CUSTOMER_FORM, type CustomerFormState } from '../customers/customerForm';
import { formatKoreanMobilePhone } from '../../utils/inputFormatters';
import { normalizeDeviceContactMatchKey } from './phoneMatchKey';
import type { DeviceContactRecord } from './deviceContactTypes';

/** 고객 등록 라우트의 source 값. DB 컬럼이 아니다. */
export const DEVICE_CONTACT_SOURCE = 'contact';

export const ALREADY_REGISTERED_CUSTOMER_MESSAGE = '이미 등록된 고객입니다';

export const CONTACT_COMPANY_JOB_HINT =
  '연락처의 회사명은 직업란에 미리 넣었습니다. 고객 등록을 누르기 전에는 저장되지 않습니다.';

export type ContactRegistrationParams = {
  name: string;
  phone: string;
  company: string;
  source: typeof DEVICE_CONTACT_SOURCE;
};

export type ContactRegistrationParamBag = {
  name?: string | string[];
  phone?: string | string[];
  company?: string | string[];
  source?: string | string[];
};

export type ContactRegistrationDecision =
  | { type: 'already_registered'; customerId: number }
  | { type: 'choose_candidate' }
  | { type: 'open_form' };

export function firstRouteParam(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

export function isContactRegistrationSource(value: unknown): boolean {
  return firstRouteParam(value) === DEVICE_CONTACT_SOURCE;
}

/** 기존 고객 등록 화면으로 넘기는 값. 회사는 직업란에만 미리 채운다. */
export function buildContactRegistrationParams(
  contact: Pick<DeviceContactRecord, 'displayName' | 'organization' | 'normalizedPhones'>,
): ContactRegistrationParams {
  const phone = contact.normalizedPhones[0] ?? '';
  return {
    name: contact.displayName.trim(),
    phone: phone ? formatKoreanMobilePhone(phone) : '',
    company: contact.organization.trim(),
    source: DEVICE_CONTACT_SOURCE,
  };
}

/**
 * source=contact 일 때만 이름·번호·회사(직업란)를 채운다.
 * 그 외 라우트는 null 이라 빈 등록 폼이 유지된다.
 */
export function createContactSourcedCustomerForm(
  params: ContactRegistrationParamBag,
): CustomerFormState | null {
  if (!isContactRegistrationSource(params.source)) {
    return null;
  }
  const base = cloneCustomerFormState(EMPTY_CUSTOMER_FORM);
  const phone = firstRouteParam(params.phone).trim();
  return {
    ...base,
    name: firstRouteParam(params.name).trim(),
    phone: phone ? formatKoreanMobilePhone(phone) : '',
    job: firstRouteParam(params.company).trim(),
  };
}

/** 등록 버튼을 누르는 시점의 고객 id 목록으로 다시 결정한다. */
export function decideContactRegistration(
  matchedCustomerIds: readonly number[],
): ContactRegistrationDecision {
  const onlyId = matchedCustomerIds.length === 1 ? matchedCustomerIds[0] : undefined;
  if (onlyId != null) {
    return { type: 'already_registered', customerId: onlyId };
  }
  if (matchedCustomerIds.length > 1) {
    return { type: 'choose_candidate' };
  }
  return { type: 'open_form' };
}

/** `tel:` / `sms:` 만 연다. CALL_PHONE·SEND_SMS 권한은 쓰지 않는다. */
export function buildDeviceContactDialUrl(phone: string, scheme: 'tel' | 'sms'): string | null {
  const key = normalizeDeviceContactMatchKey(phone);
  return key ? `${scheme}:${key}` : null;
}
