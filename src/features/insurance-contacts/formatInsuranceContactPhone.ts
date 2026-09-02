/**
 * 원수사 연락처 표시용 전화번호.
 * Web SSOT: insurance/src/features/contacts/utils/phone.ts `formatPhone`
 * — 하이픈이 있으면 원문 유지, 숫자만이면 패턴별 분절.
 * 휴대폰 formatter로 1577/1588/02 대표번호를 망가뜨리지 않는다.
 */
export function formatPhone(value: string | number | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (/[-–—‐‑‒﹣]/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (digits.startsWith('02')) {
    if (digits.length === 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    if (digits.length === 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
  }

  if (/^01[016789]/.test(digits)) {
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
  }

  if (digits.length === 9 && digits.startsWith('15')) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (
    digits.length === 10 &&
    (digits.startsWith('15') || digits.startsWith('16') || digits.startsWith('18'))
  ) {
    const prefixLen =
      digits.startsWith('1544') ||
      digits.startsWith('1566') ||
      digits.startsWith('1577')
        ? 4
        : 3;
    return `${digits.slice(0, prefixLen)}-${digits.slice(prefixLen)}`;
  }

  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  return digits;
}
