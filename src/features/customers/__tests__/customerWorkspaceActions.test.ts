import {
  buildCustomerWorkspaceActions,
  resolveCustomerWorkspaceActionHref,
} from "../customerWorkspaceActions";

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

  it("고객 컨텍스트 route를 유지한다", () => {
    expect(resolveCustomerWorkspaceActionHref(12, "files")).toBe("/customers/12/files");
    expect(resolveCustomerWorkspaceActionHref(12, "claims")).toEqual({
      pathname: "/customers/[customerId]/claim-requests",
      params: { customerId: "12" },
    });
    expect(resolveCustomerWorkspaceActionHref(12, "copy")).toBeNull();
  });
});
