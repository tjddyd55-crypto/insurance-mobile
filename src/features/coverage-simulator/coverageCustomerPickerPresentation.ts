import { formatCustomerPhone } from '../customers/customerModel';
import {
  CUSTOMER_DETAIL_EMPTY_VALUE,
  formatCustomerDetailDate,
} from '../customers/customerDetailPresentation';
import type { CustomerRecord } from '../customers/types';
import { formatDateForDisplay } from '../../utils/dateInput';

/** 보장 시뮬레이션 고객 선택 행 — map panel / PC 표기와 동일한 empty 규칙 */
export function formatCoveragePickerBirthDate(customer: Pick<CustomerRecord, 'birthDate' | 'ssn'>): string {
  const fromField = formatCustomerDetailDate(customer.birthDate ?? null);
  if (fromField !== CUSTOMER_DETAIL_EMPTY_VALUE) {
    return fromField;
  }
  const digits = String(customer.ssn ?? '').replace(/\D/g, '');
  if (digits.length < 6) {
    return CUSTOMER_DETAIL_EMPTY_VALUE;
  }
  const yy = Number(digits.slice(0, 2));
  const mm = digits.slice(2, 4);
  const dd = digits.slice(4, 6);
  const century = digits.length >= 7 ? inferResidentCentury(Number(digits[6])) : 1900;
  const year = century + yy;
  const ymd = `${year}-${mm}-${dd}`;
  const formatted = formatDateForDisplay(ymd);
  return formatted || CUSTOMER_DETAIL_EMPTY_VALUE;
}

function inferResidentCentury(genderDigit: number): number {
  if (genderDigit === 1 || genderDigit === 2 || genderDigit === 5 || genderDigit === 6) {
    return 1900;
  }
  if (genderDigit === 3 || genderDigit === 4 || genderDigit === 7 || genderDigit === 8) {
    return 2000;
  }
  return 1900;
}

export function formatCoveragePickerPhone(customer: Pick<CustomerRecord, 'phone' | 'phoneNumber'>): string {
  const raw = customer.phone || customer.phoneNumber || '';
  const formatted = formatCustomerPhone(raw);
  return formatted.trim() ? formatted : CUSTOMER_DETAIL_EMPTY_VALUE;
}

export type CoverageCustomerPickerRow = {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
};

export function toCoverageCustomerPickerRow(customer: CustomerRecord): CoverageCustomerPickerRow {
  const name = customer.name.trim() || CUSTOMER_DETAIL_EMPTY_VALUE;
  return {
    id: String(customer.id),
    name,
    birthDate: formatCoveragePickerBirthDate(customer),
    phone: formatCoveragePickerPhone(customer),
  };
}

/** 모바일 picker 2줄 row — ellipsis 없이 전체 표시 */
export function formatCoveragePickerMobileRow(row: CoverageCustomerPickerRow): {
  primary: string;
  secondary: string;
} {
  return {
    primary: row.name,
    secondary: `${row.birthDate} · ${row.phone}`,
  };
}

export function filterCoverageCustomerPickerRows(
  rows: CoverageCustomerPickerRow[],
  query: string,
): CoverageCustomerPickerRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, 50);
  return rows
    .filter((row) => {
      const haystack = `${row.name} ${row.birthDate} ${row.phone}`.toLowerCase();
      const digits = q.replace(/\D/g, '');
      if (digits.length >= 3) {
        return haystack.includes(q) || row.phone.replace(/\D/g, '').includes(digits);
      }
      return haystack.includes(q);
    })
    .slice(0, 50);
}
