import {
  getCustomerAlertDatesValidationError,
  isCustomerAlertDateEmpty,
  normalizeCustomerAlertDatesForSave,
} from "../customerAlertDateFormUtils";

describe("customerAlertDateFormUtils", () => {
  const empty = {
    purposeType: "NOTICE" as const,
    title: "",
    dateValue: "",
    memo: "",
  };

  it("detects empty draft rows", () => {
    expect(isCustomerAlertDateEmpty(empty)).toBe(true);
    expect(
      isCustomerAlertDateEmpty({ ...empty, title: "생일", dateValue: "2027-01-20" }),
    ).toBe(false);
  });

  it("validates partial alert date rows", () => {
    expect(getCustomerAlertDatesValidationError([{ ...empty, title: "생일" }])).toBe(
      "알림일 1: 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.",
    );
    expect(getCustomerAlertDatesValidationError([{ ...empty, dateValue: "2027-01-20" }])).toBe(
      "알림일 1: 알림명을 입력해 주세요.",
    );
  });

  it("normalizes empty rows out before save", () => {
    expect(
      normalizeCustomerAlertDatesForSave([
        empty,
        { ...empty, title: "자동차보험 만기", dateValue: "2027-09-16" },
      ]),
    ).toHaveLength(1);
  });
});
