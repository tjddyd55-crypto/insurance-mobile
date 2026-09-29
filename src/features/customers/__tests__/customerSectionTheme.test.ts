import {
  CUSTOMER_SECTION_THEMES,
  customerSectionBorderStyle,
  customerTaskPanelTheme,
} from "../customerSectionTheme";

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

  it("exposes task panel theme via actions section SSOT", () => {
    expect(customerTaskPanelTheme()).toEqual(CUSTOMER_SECTION_THEMES.actions);
  });

  it("applies accent border only when section is expanded", () => {
    expect(customerSectionBorderStyle("car", false, "#E5E7EB")).toEqual({
      borderColor: "#E5E7EB",
      borderWidth: 1,
    });
    expect(customerSectionBorderStyle("car", true, "#E5E7EB")).toEqual({
      borderColor: "#2563EB",
      borderWidth: 1.5,
    });
    expect(customerSectionBorderStyle(undefined, true, "#E5E7EB")).toEqual({
      borderColor: "#E5E7EB",
      borderWidth: 1,
    });
  });
});
