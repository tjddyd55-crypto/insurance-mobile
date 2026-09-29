export const CUSTOMER_INFLOW_SOURCE_VALUES = [
  "DB수급",
  "소개",
  "지인",
  "기존고객",
  "광고/마케팅",
  "기타",
  "이관고객",
] as const;

export type CustomerInflowSourceValue =
  (typeof CUSTOMER_INFLOW_SOURCE_VALUES)[number];

export const CUSTOMER_INFLOW_SOURCE_REFERRAL = "소개" as const;
export const CUSTOMER_INFLOW_SOURCE_TRANSFERRED = "이관고객" as const;

const INFLOW_SOURCES_REQUIRING_DETAIL = new Set<string>([
  CUSTOMER_INFLOW_SOURCE_REFERRAL,
  CUSTOMER_INFLOW_SOURCE_TRANSFERRED,
]);

export const CUSTOMER_INFLOW_SOURCE_OPTIONS = [
  { value: "", label: "미지정" },
  ...CUSTOMER_INFLOW_SOURCE_VALUES.map((value) => ({ value, label: value })),
];

export function requiresInflowSourceDetail(
  value: string | null | undefined,
): boolean {
  return INFLOW_SOURCES_REQUIRING_DETAIL.has(String(value ?? "").trim());
}

export function getInflowSourceDetailFieldMeta(value: string | null | undefined): {
  label: string;
  placeholder: string;
} | null {
  const normalized = String(value ?? "").trim();
  if (normalized === CUSTOMER_INFLOW_SOURCE_REFERRAL) {
    return { label: "소개자 이름", placeholder: "예: 홍길동" };
  }
  if (normalized === CUSTOMER_INFLOW_SOURCE_TRANSFERRED) {
    return {
      label: "이관한 사람",
      placeholder: "누구의 고객을 이관했는지 입력해 주세요.",
    };
  }
  return null;
}

export function resolveReferrerNameForSave(
  inflowSource: string | null | undefined,
  referrerName: string | null | undefined,
): string | null {
  if (!requiresInflowSourceDetail(inflowSource)) return null;
  const trimmed = String(referrerName ?? "").trim();
  return trimmed || null;
}

export function formatCustomerInflowSourceLabel(
  value: string | null | undefined,
): string {
  const normalized = String(value ?? "").trim();
  return normalized || "미지정";
}

export function formatCustomerInflowSourceDisplay(
  inflowSource: string | null | undefined,
  referrerName?: string | null,
): string {
  const sourceLabel = formatCustomerInflowSourceLabel(inflowSource);
  if (!requiresInflowSourceDetail(inflowSource)) return sourceLabel;
  const detail = String(referrerName ?? "").trim();
  return detail ? `${sourceLabel} · ${detail}` : sourceLabel;
}
