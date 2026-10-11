import { saveLocalFileToAndroidDownloads } from "onefc-android-downloads";

/** Android MediaStore 표시 이름 — 금지 문자 제거, .pdf 보장 */
export function sanitizeAndroidDownloadDisplayName(displayName: string): string {
  const trimmed = displayName.trim() || "onefc-download.pdf";
  const safe = trimmed.replace(/[\\/:*?"<>|]/g, "_").trim();
  const withExt = safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
  return withExt.slice(0, 180);
}

/**
 * cache `file://` 파일을 시스템 Downloads(MediaStore)에 저장한다.
 * 폴더 선택·공유 시트 없음.
 */
export async function copyCacheFileToAndroidDownloads(
  cacheFileUri: string,
  displayName: string,
  mimeType: string,
): Promise<string> {
  const fileName = sanitizeAndroidDownloadDisplayName(displayName);
  return saveLocalFileToAndroidDownloads(cacheFileUri, fileName, mimeType);
}
