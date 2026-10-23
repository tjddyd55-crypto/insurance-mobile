/**
 * Customer search policy (PC parity) — 이름 + 전화번호만.
 * - 이름: 부분일치 (공백 무시, 대소문자 무시)
 * - 전화번호: 하이픈/공백 제거 후 숫자 부분일치 (검색어에 숫자가 있을 때만)
 * 주소·메모·주민번호·생년월일 등은 절대 비교하지 않는다.
 * 빈 검색어는 true (호출부가 빈 검색 정책을 결정).
 */
export function matchesCustomerPickerQuery(
  row: { name: string; phone: string },
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLowerCase().replace(/\s/g, "");
  if (!query) return true;
  const phoneQuery = query.replace(/\D/g, "");
  const name = String(row.name ?? "").toLowerCase().replace(/\s/g, "");
  return (
    name.includes(query) ||
    (phoneQuery !== "" && String(row.phone ?? "").replace(/\D/g, "").includes(phoneQuery))
  );
}
