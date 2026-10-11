import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { ApiError } from "../../api/client";
import { copyCacheFileToAndroidDownloads } from "./androidDownloadsSave";

const REMOTE_FILE_TIMEOUT_MS = 30_000;

/** Local cache path must stay ASCII-safe; original name is kept in the share dialog. */
export function buildRemoteCacheFileName(displayName: string): string {
  const trimmed = displayName.trim();
  const extensionMatch = trimmed.match(/(\.[^./\\]+)$/);
  const extension = extensionMatch?.[1] ?? "";
  return `onefc-${Date.now()}${extension}`;
}

const DOWNLOAD_FAILURE_MESSAGE = "파일을 내려받지 못했습니다.";

async function downloadFailureMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) {
    return DOWNLOAD_FAILURE_MESSAGE;
  }
  try {
    const payload = JSON.parse(trimmed) as { message?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

type RemoteFileRequest = {
  url: string;
  fileName: string;
  mimeType: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

async function downloadRemoteBytes({
  url,
  headers,
  timeoutMs = REMOTE_FILE_TIMEOUT_MS,
}: Pick<RemoteFileRequest, "url" | "headers" | "timeoutMs">): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal, headers });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError("파일 다운로드 시간이 초과되었습니다.", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new ApiError(await downloadFailureMessage(response), response.status);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Expo web has no native file or share sheet.
 * Trigger the browser save dialog with the original file name.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function saveBlobInBrowser(bytes: Uint8Array, fileName: string, mimeType: string | null): string {
  const webDocument = globalThis.document;
  if (!webDocument || typeof URL.createObjectURL !== "function") {
    throw new ApiError("이 브라우저에서는 파일을 저장할 수 없습니다.", 400);
  }
  const blob = new Blob([toArrayBuffer(bytes)], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = webDocument.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  webDocument.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return url;
}

async function saveBytesOnDevice(bytes: Uint8Array, fileName: string): Promise<string> {
  const file = new File(Paths.cache, buildRemoteCacheFileName(fileName));
  file.create({ overwrite: true });
  file.write(bytes);
  return file.uri;
}

async function shareBytesOnDevice(bytes: Uint8Array, fileName: string, mimeType: string | null): Promise<string> {
  const uri = await saveBytesOnDevice(bytes, fileName);
  await Sharing.shareAsync(uri, {
    mimeType: mimeType || undefined,
    dialogTitle: fileName,
  });
  return uri;
}

export type DownloadRemoteFileOptions = {
  /** Android Downloads(SAF) / iOS Documents — 공유 시트 없이 사용자 접근 가능 위치 */
  saveToUserAccessibleLocation?: boolean;
};

export type DownloadRemoteFileResult = {
  uri: string;
  savedToUserAccessibleLocation: boolean;
};

export function claimBundlePdfDownloadSuccessMessage(
  savedToUserAccessibleLocation: boolean,
): string {
  if (savedToUserAccessibleLocation && Platform.OS === "android") {
    return "PDF가 다운로드되었습니다. 다운로드 폴더에서 확인할 수 있습니다.";
  }
  if (savedToUserAccessibleLocation) {
    return "PDF가 다운로드되었습니다.";
  }
  return "PDF가 다운로드되었습니다.";
}

/** Native: cache 또는 사용자 접근 위치 저장. Web: 브라우저 저장 대화상자. */
export async function downloadRemoteFile(
  {
    url,
    fileName,
    mimeType,
    headers,
    timeoutMs = REMOTE_FILE_TIMEOUT_MS,
  }: RemoteFileRequest,
  options?: DownloadRemoteFileOptions,
): Promise<DownloadRemoteFileResult> {
  if (Platform.OS === "web") {
    const bytes = await downloadRemoteBytes({ url, headers, timeoutMs });
    const uri = saveBlobInBrowser(bytes, fileName, mimeType);
    return { uri, savedToUserAccessibleLocation: true };
  }
  const bytes = await downloadRemoteBytes({ url, headers, timeoutMs });
  const cacheUri = await saveBytesOnDevice(bytes, fileName);

  if (!options?.saveToUserAccessibleLocation) {
    return { uri: cacheUri, savedToUserAccessibleLocation: false };
  }

  if (Platform.OS === "android") {
    const uri = await copyCacheFileToAndroidDownloads(
      cacheUri,
      fileName,
      mimeType || "application/octet-stream",
    );
    return { uri, savedToUserAccessibleLocation: true };
  }

  const documentFile = new File(Paths.document, buildRemoteCacheFileName(fileName));
  documentFile.create({ overwrite: true });
  documentFile.write(bytes);
  return { uri: documentFile.uri, savedToUserAccessibleLocation: true };
}

export async function shareRemoteFile({
  url,
  fileName,
  mimeType,
  headers,
  timeoutMs = REMOTE_FILE_TIMEOUT_MS,
}: RemoteFileRequest): Promise<string> {
  if (Platform.OS === "web") {
    const bytes = await downloadRemoteBytes({ url, headers, timeoutMs });
    return saveBlobInBrowser(bytes, fileName, mimeType);
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError("이 기기에서는 파일 공유를 사용할 수 없습니다.", 400);
  }
  const bytes = await downloadRemoteBytes({ url, headers, timeoutMs });
  return shareBytesOnDevice(bytes, fileName, mimeType);
}
