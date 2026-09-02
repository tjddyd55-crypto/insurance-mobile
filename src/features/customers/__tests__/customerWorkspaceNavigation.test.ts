import {
  customerDetailPath,
  customersListPath,
  goBackFromCustomerDetail,
  navigateToCustomerDetail,
} from "../customerWorkspaceNavigation";

describe("customerWorkspaceNavigation", () => {
  it("builds customer detail path for workspace back navigation", () => {
    expect(customerDetailPath(721)).toBe("/customers/721");
  });

  it("uses customers list as detail parent fallback", () => {
    expect(customersListPath()).toBe("/customers");
  });

  it("navigates to detail with replace to avoid duplicate history", () => {
    const replace = jest.fn();
    navigateToCustomerDetail({ replace }, 42);
    expect(replace).toHaveBeenCalledWith("/customers/42");
  });

  it("returns from detail to customers list with replace", () => {
    const replace = jest.fn();
    goBackFromCustomerDetail({ replace });
    expect(replace).toHaveBeenCalledWith("/customers");
  });
});
