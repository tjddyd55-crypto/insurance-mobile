import {
  customerDetailPath,
  customersListPath,
  goBackFromCustomerDetail,
  isCustomerDetailBackEnabled,
  navigateToCustomerDetail,
} from "../customerWorkspaceNavigation";

describe("customerWorkspaceNavigation", () => {
  it("builds customer detail path for workspace back navigation", () => {
    expect(customerDetailPath(721)).toBe("/customers/721");
  });

  it("uses customers list as detail parent fallback", () => {
    expect(customersListPath()).toBe("/customers");
  });

  it("returns to detail by popping the customers stack (dismissTo), never a drawer replace", () => {
    const dismissTo = jest.fn();
    navigateToCustomerDetail({ dismissTo }, 42);
    expect(dismissTo).toHaveBeenCalledWith("/customers/42");
  });

  it("returns from detail to customers list by popping the customers stack (dismissTo)", () => {
    const dismissTo = jest.fn();
    goBackFromCustomerDetail({ dismissTo });
    expect(dismissTo).toHaveBeenCalledWith("/customers");
  });

  it("disables customer detail back when customerId is missing", () => {
    expect(isCustomerDetailBackEnabled(0)).toBe(false);
    expect(isCustomerDetailBackEnabled(-1)).toBe(false);
    expect(isCustomerDetailBackEnabled(42)).toBe(true);
    expect(isCustomerDetailBackEnabled(42, { enabled: false })).toBe(false);
  });
});
