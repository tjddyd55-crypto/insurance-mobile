import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { ApiError } from "../../api/client";

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

export async function shareRemoteFile({
  url,
  fileName,
  mimeType,
  headers,
  timeoutMs = REMOTE_FILE_TIMEOUT_MS,
}: {
  url: string;
  fileName: string;
  mimeType: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError("이 기기에서는 파일 공유를 사용할 수 없습니다.", 400);
  }
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
  const file = new File(Paths.cache, buildRemoteCacheFileName(fileName));
  file.create({ overwrite: true });
  file.write(new Uint8Array(await response.arrayBuffer()));
  await Sharing.shareAsync(file.uri, {
    mimeType: mimeType || undefined,
    dialogTitle: fileName,
  });
  return file.uri;
}
