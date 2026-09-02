import { customerDetailPath } from "../customerWorkspaceNavigation";

describe("customerWorkspaceNavigation", () => {
  it("builds customer detail path for workspace back navigation", () => {
    expect(customerDetailPath(721)).toBe("/customers/721");
  });
});
