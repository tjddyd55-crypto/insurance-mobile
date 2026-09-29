import {
  coerceStoredDateValue,
  dateToYmd,
  formatDateForDisplay,
  isValidDateString,
  ymdToDate,
} from "../dateInput";

describe("dateInput", () => {
  it("validates and coerces stored YYYY-MM-DD", () => {
    expect(isValidDateString("2026-09-16")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(coerceStoredDateValue("2026-09-16")).toBe("2026-09-16");
    expect(coerceStoredDateValue("invalid")).toBe("");
  });

  it("formats display dates with dots", () => {
    expect(formatDateForDisplay("2026-09-16")).toBe("2026.09.16");
    expect(formatDateForDisplay("")).toBe("");
  });

  it("round-trips between ymd and Date", () => {
    const date = ymdToDate("2026-09-16");
    expect(date).not.toBeNull();
    expect(dateToYmd(date!)).toBe("2026-09-16");
  });
});
