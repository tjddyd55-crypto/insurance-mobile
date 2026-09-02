import {
  buildCustomerWorkspaceActions,
  resolveCustomerWorkspaceActionHref,
} from "../customerWorkspaceActions";
import { CUSTOMER_WORKSPACE_NAVIGATION_VARIANT } from "../customerFormChoices";

describe("customerWorkspaceActions", () => {
  it("운영 Web과 동일한 10개 업무 바로가기를 제공한다", () => {
    const actions = buildCustomerWorkspaceActions("홍길동");
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

  it("10개 업무 바로가기는 모두 navigation secondary semantic을 사용한다", () => {
    const actions = buildCustomerWorkspaceActions("홍길동");
    expect(CUSTOMER_WORKSPACE_NAVIGATION_VARIANT).toBe("secondary");
    expect(actions).toHaveLength(10);
  });

  it("고객 컨텍스트 route를 유지한다", () => {
    expect(resolveCustomerWorkspaceActionHref(12, "files")).toBe("/customers/12/files");
    expect(resolveCustomerWorkspaceActionHref(12, "claims")).toEqual({
      pathname: "/customers/[customerId]/claim-requests",
      params: { customerId: "12" },
    });
    expect(resolveCustomerWorkspaceActionHref(12, "copy")).toBeNull();
  });
});
