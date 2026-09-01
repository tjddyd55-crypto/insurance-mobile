export function todayYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
}
export function formatWorkspaceBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function newCustomerNoteId(now = Date.now()): string {
  return `memo-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatWorkspaceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function workspaceFileTypeLabel(mimeType: string | null): string {
  if (!mimeType) return "파일";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "이미지";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "스프레드시트";
  if (mimeType.includes("word") || mimeType.startsWith("text/")) return "문서";
  return "파일";
}
