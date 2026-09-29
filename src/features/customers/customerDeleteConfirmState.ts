export type CustomerDeleteConfirmState = {
  open: boolean;
  targetCustomerId: number | null;
};

export const CLOSED_CUSTOMER_DELETE_CONFIRM: CustomerDeleteConfirmState = {
  open: false,
  targetCustomerId: null,
};

/** 삭제 버튼 클릭 시에만 호출 — one-shot confirm open. */
export function openCustomerDeleteConfirm(customerId: number): CustomerDeleteConfirmState {
  return {
    open: true,
    targetCustomerId: customerId,
  };
}

export function closeCustomerDeleteConfirm(): CustomerDeleteConfirmState {
  return CLOSED_CUSTOMER_DELETE_CONFIRM;
}

/** 다른 고객 상세로 route param이 바뀌면 이전 confirm state를 상속하지 않는다. */
export function resetCustomerDeleteConfirmForCustomerChange(): CustomerDeleteConfirmState {
  return closeCustomerDeleteConfirm();
}

export function isCustomerDeleteConfirmVisible(
  state: CustomerDeleteConfirmState,
  activeCustomerId: number,
): boolean {
  return state.open && state.targetCustomerId === activeCustomerId;
}

export function resolveCustomerDeleteTargetId(state: CustomerDeleteConfirmState): number | null {
  return state.targetCustomerId;
}
