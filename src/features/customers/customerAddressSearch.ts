export type AddressSearchValue = {
  zonecode: string;
  baseAddress: string;
  detailAddress: string;
};

export const EMPTY_ADDRESS_SEARCH: AddressSearchValue = {
  zonecode: "",
  baseAddress: "",
  detailAddress: "",
};

/** Web `formatAddressForSave` 와 동일 규칙 */
export function formatAddressForSave(value: AddressSearchValue): string {
  const base = value.baseAddress.trim();
  const detail = value.detailAddress.trim();
  const zip = value.zonecode.trim();
  const head = zip ? `(${zip})` : "";
  return [head, base, detail].filter(Boolean).join(" ").trim();
}

/** 저장된 단일 address 문자열을 편집 폼용으로 분해 (Web recordToEditForm 동작 정렬) */
export function parseAddressFromSave(address: string): AddressSearchValue {
  const trimmed = address.trim();
  if (!trimmed) return { ...EMPTY_ADDRESS_SEARCH };
  const match = trimmed.match(/^\((\d{5})\)\s*(.*)$/);
  if (!match) {
    return { zonecode: "", baseAddress: trimmed, detailAddress: "" };
  }
  return {
    zonecode: match[1],
    baseAddress: match[2].trim(),
    detailAddress: "",
  };
}
