/** Native 고객 폼 — 섹션 ID SSOT */
export type CustomerFormSectionId =
  | "basic"
  | "vehicle"
  | "fireInsurance"
  | "business"
  | "alertDates"
  | "customFields";

/** 고객 정보 수정 화면 섹션 순서 (합의 SSOT) */
export const CUSTOMER_EDIT_FORM_SECTION_ORDER: readonly CustomerFormSectionId[] = [
  "basic",
  "vehicle",
  "fireInsurance",
  "business",
  "alertDates",
  "customFields",
];

/**
 * 신규 고객 등록 화면 섹션 순서.
 * 현재는 수정 화면과 동일하나, 등록 전용 정책이 생기면 이 배열만 조정한다.
 */
export const CUSTOMER_CREATE_FORM_SECTION_ORDER: readonly CustomerFormSectionId[] =
  CUSTOMER_EDIT_FORM_SECTION_ORDER;

export const CUSTOMER_FORM_SECTION_TITLES: Record<CustomerFormSectionId, string> = {
  basic: "기본 정보",
  vehicle: "자동차 정보",
  fireInsurance: "화재보험 정보",
  business: "사업자 정보",
  alertDates: "알림일",
  customFields: "추가 정보",
};

export const CUSTOMER_FORM_SECTION_TEST_IDS: Partial<Record<CustomerFormSectionId, string>> = {
  vehicle: "customer-form-section-vehicle",
  fireInsurance: "customer-form-section-fire-insurance",
  business: "customer-form-section-business",
  alertDates: "customer-form-section-alert-dates",
  customFields: "customer-form-section-custom-fields",
};

/**
 * 별도 accordion 없이 기본 정보 섹션 안에 렌더되는 보험/참고 입력 필드.
 * 저장 payload 키는 customerForm.ts SSOT를 따른다.
 */
export const CUSTOMER_BASIC_EMBEDDED_REFERENCE_FIELD_KEYS = [
  "treatmentHistoryNote",
  "medicationHistoryNote",
  "insuranceHistory",
  "accountNumber",
] as const;

export type CustomerBasicEmbeddedReferenceFieldKey =
  (typeof CUSTOMER_BASIC_EMBEDDED_REFERENCE_FIELD_KEYS)[number];

export function resolveCustomerFormSectionOrder(
  mode: "create" | "edit",
): readonly CustomerFormSectionId[] {
  return mode === "edit"
    ? CUSTOMER_EDIT_FORM_SECTION_ORDER
    : CUSTOMER_CREATE_FORM_SECTION_ORDER;
}
