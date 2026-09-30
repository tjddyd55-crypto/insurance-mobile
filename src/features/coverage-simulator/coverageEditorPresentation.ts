import { CUSTOMER_DETAIL_EMPTY_VALUE } from '../customers/customerDetailPresentation';

export type CoverageEditorCustomerChip = {
  id: string | null;
  name: string | null;
  birthDate?: string | null;
  phone?: string | null;
};

/** 편집 화면 상단 한 줄 고객 표시 (picker SSOT 포맷 재사용) */
export function formatCoverageEditorCustomerLine(customer: CoverageEditorCustomerChip): string | null {
  if (!customer.id) {
    return null;
  }
  const name = customer.name?.trim() || CUSTOMER_DETAIL_EMPTY_VALUE;
  const birth = customer.birthDate?.trim() || CUSTOMER_DETAIL_EMPTY_VALUE;
  const phone = customer.phone?.trim() || CUSTOMER_DETAIL_EMPTY_VALUE;
  return `${name} · ${birth} · ${phone}`;
}

/** 시나리오 라이브러리 ⋯ 메뉴 action 순서 (닫기는 마지막) */
export const SCENARIO_LIBRARY_MENU_ACTIONS = [
  'edit',
  'rename',
  'duplicate',
  'delete',
  'close',
] as const;

export type ScenarioLibraryMenuAction = (typeof SCENARIO_LIBRARY_MENU_ACTIONS)[number];
