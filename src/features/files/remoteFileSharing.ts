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

export async function shareRemoteFile({
  url,
  fileName,
  mimeType,
}: {
  url: string;
  fileName: string;
  mimeType: string | null;
}): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError("이 기기에서는 파일 공유를 사용할 수 없습니다.", 400);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_FILE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError("파일 다운로드 시간이 초과되었습니다.", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new ApiError("파일을 내려받지 못했습니다.", response.status);
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
