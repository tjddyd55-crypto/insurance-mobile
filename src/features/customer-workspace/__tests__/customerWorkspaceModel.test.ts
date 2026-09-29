import {
  consultationPreviewDate,
  formatWorkspaceBytes,
  formatWorkspaceDate,
  newCustomerNoteId,
  selectRecentConsultations,
  todayYmd,
  workspaceFileTypeLabel,
} from "../customerWorkspaceModel";
import type { Consultation } from "../types";

describe("customerWorkspaceModel", () => {
  it("formats dates and sizes", () => {
    expect(todayYmd(new Date("2026-09-01T12:00:00+09:00"))).toBe("2026-09-01");
    expect(formatWorkspaceBytes(1048576)).toBe("1.0 MB");
  });
  it("creates non-empty memo ids", () => {
    expect(newCustomerNoteId(1)).toMatch(/^memo-1-/);
  });
  it("returns the latest three consultations newest-first", () => {
    const rows: Consultation[] = [
      {
        id: 1,
        customerId: 9,
        body: "옛 상담",
        consultationDate: "2026-01-01",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: 2,
        customerId: 9,
        body: "중간",
        consultationDate: "2026-06-01",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: 3,
        customerId: 9,
        body: "최신",
        consultationDate: "2026-08-01",
        createdAt: "2026-08-01T00:00:00.000Z",
      },
      {
        id: 4,
        customerId: 9,
        body: "두 번째",
        consultationDate: "2026-07-15",
        createdAt: "2026-07-15T00:00:00.000Z",
      },
    ];
    const recent = selectRecentConsultations(rows);
    expect(recent.map((row) => row.id)).toEqual([3, 4, 2]);
    expect(consultationPreviewDate(recent[0]!)).toBe("2026-08-01");
  });
});

describe("customer file presentation", () => {
  it("파일 날짜와 종류를 사용자 용어로 표시한다", () => {
    expect(formatWorkspaceDate("invalid")).toBe("날짜 정보 없음");
    expect(workspaceFileTypeLabel("application/pdf")).toBe("PDF");
    expect(workspaceFileTypeLabel("image/jpeg")).toBe("이미지");
  });
});
