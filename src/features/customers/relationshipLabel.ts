/**
 * Web SSOT: insurance/src/features/customers/utils/relationshipLabel.js
 */

export const RELATIONSHIP_LABEL_ETC = "기타";
export const RELATIONSHIP_LABEL_SELF = "본인";
export const RELATIONSHIP_LABEL_MAX_LENGTH = 30;

export const RELATIONSHIP_LABEL_PRESETS = Object.freeze([
  RELATIONSHIP_LABEL_SELF,
  "배우자",
  "아버지",
  "어머니",
  "자녀",
  "형제",
  RELATIONSHIP_LABEL_ETC,
]);

export const RELATIONSHIP_LABEL_SELECT_OPTIONS = [
  { value: "배우자", label: "배우자" },
  { value: "아버지", label: "아버지" },
  { value: "어머니", label: "어머니" },
  { value: "자녀", label: "자녀" },
  { value: "형제", label: "형제·자매" },
  { value: RELATIONSHIP_LABEL_ETC, label: RELATIONSHIP_LABEL_ETC },
];

export function resolveRelationshipLabel(
  option: string,
  customRaw: string,
): string | null {
  const opt = String(option ?? "").trim();
  if (!opt) return null;
  if (opt === RELATIONSHIP_LABEL_ETC) {
    const custom = String(customRaw ?? "").trim();
    if (!custom) return null;
    return custom.slice(0, RELATIONSHIP_LABEL_MAX_LENGTH);
  }
  return opt;
}
