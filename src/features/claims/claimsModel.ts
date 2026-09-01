import type { ClaimStatus } from "./types";

const LABELS: Record<ClaimStatus, string> = {
  requested: "요청됨",
  processing: "처리중",
  done: "완료",
  rejected: "반려",
  canceled: "취소",
};
export const CLAIM_STATUSES = (Object.keys(LABELS) as ClaimStatus[]).map(
  (value) => ({ value, label: LABELS[value] }),
);
export function claimStatusMeta(status: ClaimStatus): {
  label: string;
  tone: "info" | "warning" | "success" | "danger" | "default";
} {
  if (status === "done") return { label: LABELS[status], tone: "success" };
  if (status === "processing") return { label: LABELS[status], tone: "info" };
  if (status === "requested") return { label: LABELS[status], tone: "warning" };
  if (status === "rejected") return { label: LABELS[status], tone: "danger" };
  return { label: LABELS[status], tone: "default" };
}
export function formatClaimDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
export function claimMessage(title: string, memo: string): string {
  return memo.trim() || title.trim() || "요청 내용이 없습니다.";
}
export function extractClaimFileUrl(
  file: { url?: string; downloadUrl?: string },
  download = false,
): string {
  return String(
    (download ? file.downloadUrl : file.url) || file.url || "",
  ).trim();
}

export function claimListPreview(title: string, memo: string): string {
  const message = claimMessage(title, memo);
  return message.length <= 140 ? message : `${message.slice(0, 137)}…`;
}

export function formatClaimRequester(
  name: string,
  birthDate: string,
  phone: string,
): string {
  const digits = phone.replace(/\D/g, "");
  const formattedPhone =
    digits.length === 11
      ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
      : digits.length === 10
        ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
        : phone.trim();
  return [name.trim(), birthDate.trim(), formattedPhone]
    .filter(Boolean)
    .join(" · ");
}

export function formatClaimFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 ** 2) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function claimFileTypeLabel(contentType: string): string {
  const value = contentType.toLowerCase();
  if (value === "application/pdf") return "PDF";
  if (value.startsWith("image/")) return "이미지";
  if (value.includes("zip")) return "ZIP";
  return "파일";
}
