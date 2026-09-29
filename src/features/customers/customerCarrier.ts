export const CUSTOMER_MOBILE_CARRIER_CODES = [
  "SKT",
  "KT",
  "LG_U_PLUS",
  "SKT_MVNO",
  "KT_MVNO",
  "LG_U_PLUS_MVNO",
] as const;

export type CustomerMobileCarrierCode =
  (typeof CUSTOMER_MOBILE_CARRIER_CODES)[number];

const CARRIER_LABEL_BY_CODE: Record<CustomerMobileCarrierCode, string> = {
  SKT: "SKT",
  KT: "KT",
  LG_U_PLUS: "LG U+",
  SKT_MVNO: "SKT 알뜰폰",
  KT_MVNO: "KT 알뜰폰",
  LG_U_PLUS_MVNO: "LG U+ 알뜰폰",
};

const CARRIER_CODE_BY_LABEL: Record<string, CustomerMobileCarrierCode> = {
  SKT: "SKT",
  KT: "KT",
  "LG U+": "LG_U_PLUS",
  "LG U＋": "LG_U_PLUS",
  "SKT 알뜰폰": "SKT_MVNO",
  "KT 알뜰폰": "KT_MVNO",
  "LG U+ 알뜰폰": "LG_U_PLUS_MVNO",
  "LG U＋ 알뜰폰": "LG_U_PLUS_MVNO",
};

export const CUSTOMER_MOBILE_CARRIER_OPTIONS = [
  { value: "", label: "통신사를 선택해 주세요" },
  ...CUSTOMER_MOBILE_CARRIER_CODES.map((code) => ({
    value: code,
    label: CARRIER_LABEL_BY_CODE[code],
  })),
];

export function isCustomerMobileCarrierCode(
  value: string | null | undefined,
): value is CustomerMobileCarrierCode {
  const normalized = String(value ?? "").trim();
  return (CUSTOMER_MOBILE_CARRIER_CODES as readonly string[]).includes(
    normalized,
  );
}

export function normalizeCustomerCarrierForForm(
  raw: string | null | undefined,
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  if (isCustomerMobileCarrierCode(trimmed)) return trimmed;
  return CARRIER_CODE_BY_LABEL[trimmed] ?? trimmed;
}

export function normalizeCustomerCarrierForSave(
  raw: string | null | undefined,
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  if (isCustomerMobileCarrierCode(trimmed)) return trimmed;
  return CARRIER_CODE_BY_LABEL[trimmed] ?? trimmed;
}

export function formatCustomerMobileCarrierDisplay(
  raw: string | null | undefined,
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  if (isCustomerMobileCarrierCode(trimmed)) {
    return CARRIER_LABEL_BY_CODE[trimmed];
  }
  return trimmed;
}
