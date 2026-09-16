import {
  CLOSED_CUSTOMER_DELETE_CONFIRM,
  closeCustomerDeleteConfirm,
  isCustomerDeleteConfirmVisible,
  openCustomerDeleteConfirm,
  resetCustomerDeleteConfirmForCustomerChange,
  resolveCustomerDeleteTargetId,
} from "../customerDeleteConfirmState";

describe("customerDeleteConfirmState", () => {
  it("Case 1: confirm 후 success 시 closed state로 reset된다", () => {
    const opened = openCustomerDeleteConfirm(10);
    expect(opened.open).toBe(true);
    expect(opened.targetCustomerId).toBe(10);

    const closed = closeCustomerDeleteConfirm();
    expect(closed).toEqual(CLOSED_CUSTOMER_DELETE_CONFIRM);
    expect(resolveCustomerDeleteTargetId(closed)).toBeNull();
  });

  it("Case 2: A 삭제 confirm open 후 B customerId로 변경되면 confirm이 보이지 않는다", () => {
    const afterA = openCustomerDeleteConfirm(1);
    const afterNavigateToB = resetCustomerDeleteConfirmForCustomerChange();

    expect(isCustomerDeleteConfirmVisible(afterA, 2)).toBe(false);
    expect(isCustomerDeleteConfirmVisible(afterNavigateToB, 2)).toBe(false);
  });

  it("Case 3: B 상세에서는 delete 버튼을 누르기 전까지 confirm이 열리지 않는다", () => {
    const initial = closeCustomerDeleteConfirm();
    expect(isCustomerDeleteConfirmVisible(initial, 2)).toBe(false);
  });

  it("Case 4: B에서 delete 버튼 클릭 시에만 B target confirm이 열린다", () => {
    const openedForB = openCustomerDeleteConfirm(2);
    expect(isCustomerDeleteConfirmVisible(openedForB, 2)).toBe(true);
    expect(isCustomerDeleteConfirmVisible(openedForB, 1)).toBe(false);
  });

  it("Case 5: confirm target id는 open 시점 customerId와 일치한다", () => {
    const openedForA = openCustomerDeleteConfirm(1);
    const openedForB = openCustomerDeleteConfirm(2);

    expect(resolveCustomerDeleteTargetId(openedForA)).toBe(1);
    expect(resolveCustomerDeleteTargetId(openedForB)).toBe(2);
    expect(resolveCustomerDeleteTargetId(openedForA)).not.toBe(2);
  });
});
