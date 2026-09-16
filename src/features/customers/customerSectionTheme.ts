/** Figma ONE FC Customer Detail — section accent SSOT (Native). */
export type CustomerSectionId =
  | 'basic'
  | 'car'
  | 'linked'
  | 'business'
  | 'fire'
  | 'anniversary'
  | 'customFields'
  | 'consultation'
  | 'actions'

export type CustomerSectionTheme = {
  id: CustomerSectionId
  accent: string
  tint: string
}

export const CUSTOMER_SECTION_THEMES: Record<CustomerSectionId, CustomerSectionTheme> = {
  basic: { id: 'basic', accent: '#334155', tint: '#F8FAFC' },
  car: { id: 'car', accent: '#2563EB', tint: '#EFF6FF' },
  linked: { id: 'linked', accent: '#14B8A6', tint: '#F0FDFA' },
  business: { id: 'business', accent: '#16A34A', tint: '#F0FDF4' },
  fire: { id: 'fire', accent: '#D97706', tint: '#FFFBEB' },
  anniversary: { id: 'anniversary', accent: '#7C3AED', tint: '#F5F3FF' },
  customFields: { id: 'customFields', accent: '#475569', tint: '#F8FAFC' },
  consultation: { id: 'consultation', accent: '#16A34A', tint: '#F0FDF4' },
  /** 고객 업무 — brand primary (기본 정보 slate와 구분) */
  actions: { id: 'actions', accent: '#16A34A', tint: '#ECFDF5' },
}

export function customerSectionTheme(sectionId: CustomerSectionId): CustomerSectionTheme {
  return CUSTOMER_SECTION_THEMES[sectionId]
}

/** 고객 업무 패널 — actions section theme alias (Native SSOT). */
export function customerTaskPanelTheme(): CustomerSectionTheme {
  return CUSTOMER_SECTION_THEMES.actions
}

const EXPANDED_SECTION_BORDER_WIDTH = 1.5
const COLLAPSED_SECTION_BORDER_WIDTH = 1

/** accordion 펼침 시 섹션 accent border, 접힘 시 neutral. */
export function customerSectionBorderStyle(
  sectionId: CustomerSectionId | undefined,
  expanded: boolean,
  neutralBorder: string,
): { borderColor: string; borderWidth: number } {
  if (!expanded || !sectionId) {
    return {
      borderColor: neutralBorder,
      borderWidth: COLLAPSED_SECTION_BORDER_WIDTH,
    }
  }
  return {
    borderColor: CUSTOMER_SECTION_THEMES[sectionId].accent,
    borderWidth: EXPANDED_SECTION_BORDER_WIDTH,
  }
}
