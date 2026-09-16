import {
  claimFileTypeLabel,
  claimListPreview,
  claimMessage,
  claimStatusMeta,
  extractClaimFileUrl,
  formatClaimDate,
  formatClaimFileSize,
  formatClaimRequester,
  summarizeClaimRows,
} from "../claimsModel";
import type { ClaimListItem } from "../types";

describe("claimsModel", () => {
  it("운영 Web과 동일한 청구 상태 의미를 사용한다", () => {
    expect(claimStatusMeta("requested")).toEqual({
      label: "요청됨",
      tone: "warning",
    });
    expect(claimStatusMeta("processing").tone).toBe("info");
    expect(claimStatusMeta("done").tone).toBe("success");
    expect(claimStatusMeta("rejected").tone).toBe("danger");
    expect(claimStatusMeta("canceled").tone).toBe("danger");
  });

  it("메모를 요청 내용의 우선값으로 표시한다", () => {
    expect(claimMessage("보험금 청구", "진단서 첨부")).toBe("진단서 첨부");
    expect(formatClaimDate(null)).toBe("—");
  });

  it("긴 목록 내용을 140자 이내로 제한한다", () => {
    const preview = claimListPreview("", "가".repeat(150));
    expect(preview.length).toBeLessThanOrEqual(140);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("요청자와 파일 메타 정보를 표시한다", () => {
    expect(formatClaimRequester("홍길동", "1990-01-01", "01012345678")).toBe(
      "홍길동 · 1990-01-01 · 010-1234-5678",
    );
    expect(formatClaimFileSize(1024)).toBe("1 KB");
    expect(claimFileTypeLabel("application/pdf")).toBe("PDF");
  });

  it("다운로드 시 signed URL을 우선한다", () => {
    expect(
      extractClaimFileUrl({ url: "open", downloadUrl: "signed" }, true),
    ).toBe("signed");
  });

  it("청구 목록 상태 요약을 계산한다", () => {
    const rows: ClaimListItem[] = [
      {
        id: 1,
        customerId: 1,
        deviceId: "d",
        customerName: "A",
        requesterName: "A",
        requesterBirthDate: "",
        requesterPhone: "",
        status: "requested",
        title: "",
        memo: "",
        submittedAt: null,
        fileCount: 0,
      },
      {
        id: 2,
        customerId: 2,
        deviceId: "d",
        customerName: "B",
        requesterName: "B",
        requesterBirthDate: "",
        requesterPhone: "",
        status: "processing",
        title: "",
        memo: "",
        submittedAt: null,
        fileCount: 1,
      },
      {
        id: 3,
        customerId: 3,
        deviceId: "d",
        customerName: "C",
        requesterName: "C",
        requesterBirthDate: "",
        requesterPhone: "",
        status: "done",
        title: "",
        memo: "",
        submittedAt: null,
        fileCount: 2,
      },
    ];
    expect(summarizeClaimRows(rows)).toEqual({
      total: 3,
      requested: 1,
      processing: 1,
      done: 1,
      rejected: 0,
      canceled: 0,
    });
  });
});
