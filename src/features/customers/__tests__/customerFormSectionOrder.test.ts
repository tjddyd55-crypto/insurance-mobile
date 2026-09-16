import {
  CUSTOMER_BASIC_EMBEDDED_REFERENCE_FIELD_KEYS,
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
      "fireInsurance",
      "business",
      "alertDates",
      "customFields",
    ]);
    expect(CUSTOMER_EDIT_FORM_SECTION_ORDER).not.toContain("insuranceReference");
    expect(CUSTOMER_FORM_SECTION_TITLES.alertDates).toBe("알림일");
    expect(CUSTOMER_FORM_SECTION_TITLES.customFields).toBe("추가 정보");
    expect(CUSTOMER_FORM_SECTION_TEST_IDS.fireInsurance).toBe(
      "customer-form-section-fire-insurance",
    );
    expect(CUSTOMER_FORM_SECTION_TEST_IDS.business).toBe("customer-form-section-business");
  });

  it("keeps insurance/reference inputs embedded in basic info", () => {
    expect(CUSTOMER_BASIC_EMBEDDED_REFERENCE_FIELD_KEYS).toEqual([
      "treatmentHistoryNote",
      "medicationHistoryNote",
      "insuranceHistory",
      "accountNumber",
    ]);
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
