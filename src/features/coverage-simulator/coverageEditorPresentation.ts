import { CUSTOMER_DETAIL_EMPTY_VALUE } from '../customers/customerDetailPresentation';
import type { CoverageLinkedCustomer } from './coverageCustomerSession';

export type CoverageEditorCustomerChip = {
  id: string | null;
  name: string | null;
  birthDate?: string | null;
  phone?: string | null;
};

/** 대시 자리표시는 비어 있는 값으로 본다. */
export function meaningfulCoverageChipPart(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed === CUSTOMER_DETAIL_EMPTY_VALUE) return null;
  return trimmed;
}

/** 편집 화면 상단 한 줄. 없는 생년월일·연락처는 빼서 이름만 남긴다. */
export function formatCoverageEditorCustomerLine(customer: CoverageEditorCustomerChip): string | null {
  if (!customer.id) return null;
  const parts = [customer.name, customer.birthDate, customer.phone]
    .map(meaningfulCoverageChipPart)
    .filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** 저장본 이름은 유지하고, 피커 행과 같은 생년월일·연락처만 채운다. */
export function savedCustomerChipFromPickerRow(
  saved: { id: string; name: string | null },
  row: { birthDate: string; phone: string },
): CoverageLinkedCustomer {
  return {
    id: saved.id,
    name: saved.name,
    birthDate: meaningfulCoverageChipPart(row.birthDate),
    phone: meaningfulCoverageChipPart(row.phone),
  };
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
