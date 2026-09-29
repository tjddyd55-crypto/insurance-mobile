import { formatCustomerPhone } from '../customers/customerModel';
import {
  CUSTOMER_DETAIL_EMPTY_VALUE,
  formatCustomerDetailDate,
  formatCustomerGenderParenthetical,
  getCustomerGenderPresentationTone,
} from '../customers/customerDetailPresentation';
import type { CustomerGender } from '../customers/types';
import type { CustomerMapItem } from './types';

/** map API `genderLabel`(`남`/`여`) → detail gender SSOT */
export function mapApiGenderLabelToGender(label: string | null | undefined): CustomerGender {
  const normalized = String(label ?? '').trim();
  if (normalized === '남') {
    return 'male';
  }
  if (normalized === '여') {
    return 'female';
  }
  return null;
}

export type CustomerMapPanelPresentation = {
  displayName: string;
  genderParenthetical: string | null;
  genderTone: 'male' | 'female' | null;
  birthDate: string;
  phone: string;
  address: string;
};

export function buildCustomerMapPanelPresentation(
  customer: CustomerMapItem,
): CustomerMapPanelPresentation {
  const displayName = customer.name.trim() || '이름 없음';
  const genderParenthetical = formatCustomerGenderParenthetical(customer.gender);
  const genderTone = getCustomerGenderPresentationTone(customer.gender);
  const birthDate = formatCustomerDetailDate(customer.birthDateYmd);
  const phoneFormatted = formatCustomerPhone(customer.phone);
  const phone = phoneFormatted.trim() ? phoneFormatted : CUSTOMER_DETAIL_EMPTY_VALUE;
  const address = customer.address.trim() || CUSTOMER_DETAIL_EMPTY_VALUE;

  return {
    displayName,
    genderParenthetical,
    genderTone,
    birthDate: birthDate === CUSTOMER_DETAIL_EMPTY_VALUE ? CUSTOMER_DETAIL_EMPTY_VALUE : birthDate,
    phone,
    address,
  };
}

export function buildGroupSelectionTitle(customers: CustomerMapItem[], count: number): string {
  if (count <= 1) {
    return customers[0]?.name.trim() || '이름 없음';
  }
  const firstName = customers[0]?.name.trim() || '이름 없음';
  return `${firstName} 외 ${count - 1}명`;
}
