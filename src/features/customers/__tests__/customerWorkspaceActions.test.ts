import {
  buildCustomerWorkspaceActions,
  CUSTOMER_WORKSPACE_ACTIONS_HIDDEN_ON_MOBILE,
  resolveCustomerWorkspaceActionHref,
} from "../customerWorkspaceActions";
import { CUSTOMER_WORKSPACE_NAVIGATION_VARIANT } from "../customerFormChoices";

describe("customerWorkspaceActions", () => {
  it("Native 고객 상세에서는 map/premiumPayments를 숨긴다", () => {
    const actions = buildCustomerWorkspaceActions("홍길동");
    expect(actions.map((action) => action.id)).toEqual([
      "files",
      "consultations",
      "applications",
      "gaData",
      "personalMessage",
      "claims",
      "memos",
      "copy",
    ]);
    expect(CUSTOMER_WORKSPACE_ACTIONS_HIDDEN_ON_MOBILE).toEqual(["map", "premiumPayments"]);
  });

  it("includeMobileHidden 옵션으로 전체 action을 복구할 수 있다", () => {
    const actions = buildCustomerWorkspaceActions("홍길동", { includeMobileHidden: true });
    expect(actions.map((action) => action.id)).toEqual([
      "map",
      "files",
      "consultations",
      "applications",
      "gaData",
      "personalMessage",
      "claims",
      "memos",
      "copy",
      "premiumPayments",
    ]);
  });

  it("업무 바로가기는 모두 navigation secondary semantic을 사용한다", () => {
    const actions = buildCustomerWorkspaceActions("홍길동");
    expect(CUSTOMER_WORKSPACE_NAVIGATION_VARIANT).toBe("secondary");
    expect(actions).toHaveLength(8);
  });

  it("고객 컨텍스트 route를 유지한다", () => {
    expect(resolveCustomerWorkspaceActionHref(12, "files")).toBe("/customers/12/files");
    expect(resolveCustomerWorkspaceActionHref(12, "claims")).toEqual({
      pathname: "/customers/[customerId]/claim-requests",
      params: { customerId: "12" },
    });
    expect(resolveCustomerWorkspaceActionHref(12, "copy")).toBeNull();
    expect(resolveCustomerWorkspaceActionHref(12, "map")).toEqual({
      pathname: "/customers/[customerId]/map",
      params: { customerId: "12" },
    });
  });
});
