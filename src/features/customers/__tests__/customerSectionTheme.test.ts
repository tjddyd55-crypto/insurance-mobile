import { CUSTOMER_SECTION_THEMES } from "../customerSectionTheme";

describe("customerSectionTheme", () => {
  it("matches approved Figma section accents", () => {
    expect(CUSTOMER_SECTION_THEMES.basic.accent).toBe("#334155");
    expect(CUSTOMER_SECTION_THEMES.fire.tint).toBe("#FFFBEB");
    expect(CUSTOMER_SECTION_THEMES.consultation.accent).toBe("#16A34A");
  });
});
