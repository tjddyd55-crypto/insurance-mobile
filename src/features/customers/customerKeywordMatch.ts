import { useEffect, useState } from 'react';

/**
 * 고객 리스트 검색 — PC(웹 main src/features/customers/lib/customerKeywordMatch.ts) 와 같은 규칙.
 * - 이름: 공백·대소문자 무시 부분일치
 * - 전화번호: 검색어에 숫자가 있을 때만, 숫자만 비교 (010-1234-5678 ↔ 0101234 / 010-1234 / 5678)
 * 고객코드 / id / 주소 / 메모 등은 검색하지 않는다.
 */
export function customerMatchesNamePhoneKeyword(
  customer: { name?: string | null; phone?: string | null },
  keyword: string,
): boolean {
  const nameQ = keyword.replace(/\s+/g, '').toLowerCase();
  if (!nameQ) return true;
  const name = (customer.name ?? '').replace(/\s+/g, '').toLowerCase();
  if (name.includes(nameQ)) return true;
  const digitsQ = keyword.replace(/\D/g, '');
  if (!digitsQ) return false;
  return (customer.phone ?? '').replace(/\D/g, '').includes(digitsQ);
}

/** PC 고객 검색 debounce(ms). */
export const CUSTOMER_SEARCH_DEBOUNCE_MS = 180;

/** PC useDebounce 와 같다: 빈 값은 지연 없이, 그 외에는 delay 후 마지막 값만 반영(이전 타이머 취소). */
export function useDebouncedSearch(value: string, delayMs: number = CUSTOMER_SEARCH_DEBOUNCE_MS): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (value === '') {
      setDebounced('');
      return undefined;
    }
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return value === '' ? '' : debounced;
}
