import {
  getCustomerCustomFieldsValidationError,
  isCustomerCustomFieldEmpty,
} from "../customerCustomFieldFormUtils";

describe("customerCustomFieldFormUtils", () => {
  it("ignores fully empty rows", () => {
    expect(isCustomerCustomFieldEmpty({ label: "", value: "" })).toBe(true);
    expect(getCustomerCustomFieldsValidationError([{ label: "", value: "" }])).toBeNull();
  });

  it("requires both label and value", () => {
    expect(
      getCustomerCustomFieldsValidationError([{ label: "라벨만", value: "" }]),
    ).toBe("라벨과 내용을 모두 입력해 주세요.");
    expect(
      getCustomerCustomFieldsValidationError([{ label: "", value: "값만" }]),
    ).toBe("라벨과 내용을 모두 입력해 주세요.");
  });
});
