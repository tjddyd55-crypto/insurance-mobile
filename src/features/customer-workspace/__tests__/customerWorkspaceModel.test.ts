import {
  formatWorkspaceBytes,
  formatWorkspaceDate,
  newCustomerNoteId,
  todayYmd,
  workspaceFileTypeLabel,
} from "../customerWorkspaceModel";
describe("customerWorkspaceModel", () => {
  it("formats dates and sizes", () => {
    expect(todayYmd(new Date("2026-09-01T12:00:00+09:00"))).toBe("2026-09-01");
    expect(formatWorkspaceBytes(1048576)).toBe("1.0 MB");
  });
  it("creates non-empty memo ids", () => {
    expect(newCustomerNoteId(1)).toMatch(/^memo-1-/);
  });
});

describe("customer file presentation", () => {
  it("파일 날짜와 종류를 사용자 용어로 표시한다", () => {
    expect(formatWorkspaceDate("invalid")).toBe("날짜 정보 없음");
    expect(workspaceFileTypeLabel("application/pdf")).toBe("PDF");
    expect(workspaceFileTypeLabel("image/jpeg")).toBe("이미지");
  });
});
