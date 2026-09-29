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

/** ⋯ 메뉴 토글 — menuItemId SSOT */
export function resolveCoverageItemMenuToggle(menuItemId: string | null, itemId: string): string | null {
  return menuItemId === itemId ? null : itemId;
}
