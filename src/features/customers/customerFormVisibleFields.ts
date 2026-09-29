/**
 * Customer create/edit 화면에 노출하는 입력 필드 키.
 * birthDate는 API contract 유지만 하고 UI에는 넣지 않는다.
 */
export const CUSTOMER_FORM_VISIBLE_FIELDS = [
  "name",
  "phone",
  "ssn",
  "gender",
  "carrier",
  "height",
  "weight",
  "job",
  "address",
  "inflowSource",
  "referrerName",
  "isFavorite",
  "driver",
  "memo",
] as const;

export type CustomerFormVisibleField =
  (typeof CUSTOMER_FORM_VISIBLE_FIELDS)[number];
