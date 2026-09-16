import {
  CUSTOMER_CREATE_FORM_SECTION_ORDER,
  CUSTOMER_EDIT_FORM_SECTION_ORDER,
  CUSTOMER_FORM_SECTION_TITLES,
  CUSTOMER_FORM_SECTION_TEST_IDS,
  resolveCustomerFormSectionOrder,
} from "../customerFormSectionOrder";

describe("customerFormSectionOrder", () => {
  it("fixes native edit section order", () => {
    expect(CUSTOMER_EDIT_FORM_SECTION_ORDER).toEqual([
      "basic",
      "vehicle",
      "business",
      "fireInsurance",
      "alertDates",
      "insuranceReference",
      "customFields",
    ]);
    expect(CUSTOMER_FORM_SECTION_TITLES.alertDates).toBe("알림일");
    expect(CUSTOMER_FORM_SECTION_TITLES.insuranceReference).toBe("보험 / 참고 정보");
    expect(CUSTOMER_FORM_SECTION_TITLES.customFields).toBe("추가 정보");
    expect(CUSTOMER_FORM_SECTION_TEST_IDS.insuranceReference).toBe(
      "customer-form-section-insurance-reference",
    );
  });

  it("keeps create order policy separate from edit SSOT", () => {
    expect(resolveCustomerFormSectionOrder("create")).toEqual(
      CUSTOMER_CREATE_FORM_SECTION_ORDER,
    );
    expect(resolveCustomerFormSectionOrder("edit")).toEqual(
      CUSTOMER_EDIT_FORM_SECTION_ORDER,
    );
  });
});
