import { CUSTOMER_SECTION_THEMES } from "../customerSectionTheme";

describe("customerSectionTheme", () => {
  it("matches approved Figma section accents", () => {
    expect(CUSTOMER_SECTION_THEMES.basic.accent).toBe("#334155");
    expect(CUSTOMER_SECTION_THEMES.fire.tint).toBe("#FFFBEB");
    expect(CUSTOMER_SECTION_THEMES.consultation.accent).toBe("#16A34A");
  });

  it("separates workspace actions from basic info accents", () => {
    expect(CUSTOMER_SECTION_THEMES.actions.accent).toBe("#16A34A");
    expect(CUSTOMER_SECTION_THEMES.basic.accent).toBe("#334155");
    expect(CUSTOMER_SECTION_THEMES.actions.accent).not.toBe(
      CUSTOMER_SECTION_THEMES.basic.accent,
    );
  });
});
