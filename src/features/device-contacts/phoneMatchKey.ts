/**
 * 고객 대조에 쓰는 전화번호 키.
 *
 * CRM이 저장·검색에 쓰는 규칙은 숫자만 남기는 것이다.
 * - insurance `server/lib/phoneNormalize.js` `normalizeKrMobile`
 * - insurance `src/lib/phoneNormalize.ts` `normalizeKrMobile`
 * - 고객 검색 SQL `regexp_replace(COALESCE(c.phone, ''), '\\D', '', 'g')`
 *
 * 기기 연락처는 `+82 10 1234 5678`처럼 국가번호를 붙인 값이 많다.
 * CRM에 있는 국내 번호와 맞추려고, 숫자화 다음에 한국 국가번호 82만
 * 국내 0 형식으로 접는다. 고객 레코드를 다시 저장하지는 않는다.
 */

export const DEVICE_CONTACT_MIN_PHONE_DIGITS = 8;
export const DEVICE_CONTACT_MAX_PHONE_DIGITS = 15;

const KOREA_CALLING_CODE = '82';
const DOMESTIC_MAX_DIGITS = 11;

/** 목록에서 빼는 기준. 화면·문서·테스트가 같은 문장을 쓴다. */
export const DEVICE_CONTACT_PHONE_EXCLUSION_POLICY =
  '전화번호가 없거나, 숫자만 남긴 뒤 8자리 미만 또는 15자리 초과인 연락처는 목록에서 제외한다.';

/** CRM `normalizeKrMobile` / 고객 검색과 같은 숫자화. */
export function stripCrmPhoneDigits(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/\D/g, '');
}

/**
 * `821012345678` → `01012345678`, `8201012345678` → `01012345678`.
 * 국내 번호로 보기 어려운 길이는 접지 않는다.
 */
export function foldKoreaCountryCode(digits: string): string {
  if (!digits.startsWith(KOREA_CALLING_CODE)) {
    return digits;
  }
  const rest = digits.slice(KOREA_CALLING_CODE.length);
  if (!rest) {
    return digits;
  }
  const domestic = rest.startsWith('0') ? rest : `0${rest}`;
  const length = domestic.length;
  if (length < DEVICE_CONTACT_MIN_PHONE_DIGITS || length > DOMESTIC_MAX_DIGITS) {
    return digits;
  }
  return domestic;
}

/** 대조·전화/문자 링크에 쓰는 키. 비거나 길이가 벗어나면 null. */
export function normalizeDeviceContactMatchKey(raw: string | null | undefined): string | null {
  const digits = stripCrmPhoneDigits(raw);
  if (!digits) {
    return null;
  }
  const folded = foldKoreaCountryCode(digits);
  if (
    folded.length < DEVICE_CONTACT_MIN_PHONE_DIGITS
    || folded.length > DEVICE_CONTACT_MAX_PHONE_DIGITS
  ) {
    return null;
  }
  return folded;
}

/** 한 칸에 `/`, `,` 로 여러 번호가 들어온 경우까지 키로 만든다. */
export function uniqueMatchKeys(rawValues: readonly string[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawValues) {
    const parts = String(raw).split(/[/|;,]+/);
    for (const part of parts) {
      const key = normalizeDeviceContactMatchKey(part);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

/** 검색창용. 전체 번호면 국내 형식으로 접은 값도 함께 비교한다. */
export function phoneSearchNeedles(rawQuery: string): string[] {
  const digits = stripCrmPhoneDigits(rawQuery);
  if (!digits) {
    return [];
  }
  const folded = foldKoreaCountryCode(digits);
  return folded === digits ? [digits] : [digits, folded];
}
