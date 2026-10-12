import { matchesCustomerPickerQuery } from "../customerPickerSearch";

const rows = [
  { id: 1, name: "김철수", phone: "010-1234-5678" },
  { id: 2, name: "이영희", phone: "010-9999-0000" },
  { id: 3, name: "Park", phone: "" },
];
const pick = (q: string) => rows.filter((r) => matchesCustomerPickerQuery(r, q)).map((r) => r.id);

describe("matchesCustomerPickerQuery", () => {
  it("name search filters (no longer matches every phone)", () => {
    expect(pick("김철")).toEqual([1]);
    expect(pick("영희")).toEqual([2]);
    expect(pick("park")).toEqual([3]);
    expect(pick("없는이름")).toEqual([]);
  });
  it("phone search with or without dashes", () => {
    expect(pick("1234")).toEqual([1]);
    expect(pick("010-9999")).toEqual([2]);
    expect(pick("010")).toEqual([1, 2]);
  });
  it("empty query matches all (caller decides empty-query policy)", () => {
    expect(pick("  ")).toEqual([1, 2, 3]);
  });
  it("selected row is the matched row", () => {
    const hit = rows.find((r) => matchesCustomerPickerQuery(r, "이영희"));
    expect(hit?.id).toBe(2);
  });
});
