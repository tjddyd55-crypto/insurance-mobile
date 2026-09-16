import { createCustomerBasicFormSnapshot } from "../customerFormDraft";
import { EMPTY_CUSTOMER_FORM } from "../customerForm";
import { CUSTOMER_DETAIL_CORE_SECTION_TEST_IDS } from "../customerCoreSectionOrder";
import { resolveCustomerCustomFieldModalTitle } from "../detail-sections/CustomerCustomFieldModal";
import { getCustomerCustomFieldsValidationError } from "../customerCustomFieldFormUtils";

describe("customer basic inline custom fields policy", () => {
  it("modal title은 create/edit 모드에 따라 구분한다", () => {
    expect(resolveCustomerCustomFieldModalTitle("create")).toBe("추가 정보 등록");
    expect(resolveCustomerCustomFieldModalTitle("edit")).toBe("추가 정보 수정");
  });

  it("고객 상세 core accordion에 custom fields section testID가 없다", () => {
    expect(CUSTOMER_DETAIL_CORE_SECTION_TEST_IDS).not.toContain(
      "customer-detail-section-custom-fields",
    );
    expect(CUSTOMER_DETAIL_CORE_SECTION_TEST_IDS).toEqual([
      "customer-detail-section-basic",
      "customer-detail-section-vehicle",
      "customer-detail-section-linked-customers",
      "customer-detail-section-fire-insurance",
      "customer-detail-section-business",
      "customer-detail-section-special-dates",
    ]);
  });

  it("basic edit snapshot에 customFields를 포함하지 않는다", () => {
    const draft = {
      ...EMPTY_CUSTOMER_FORM,
      name: "홍길동",
      customFields: [{ label: "자녀", value: "박OO" }],
    };
    const snapshot = createCustomerBasicFormSnapshot(draft);
    expect(snapshot).not.toContain("customFields");
    expect(snapshot).not.toContain("박OO");
  });

  it("create/edit modal validation은 label/value 모두 필수다", () => {
    expect(getCustomerCustomFieldsValidationError([{ label: "라벨", value: "" }])).toBe(
      "라벨과 내용을 모두 입력해 주세요.",
    );
    expect(getCustomerCustomFieldsValidationError([{ label: "", value: "값" }])).toBe(
      "라벨과 내용을 모두 입력해 주세요.",
    );
    expect(getCustomerCustomFieldsValidationError([{ label: "라벨", value: "값" }])).toBeNull();
  });
});
