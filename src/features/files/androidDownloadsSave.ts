import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";

import { ApiError } from "../../api/client";

const { StorageAccessFramework } = FileSystem;

const ANDROID_DOWNLOADS_SAF_DIRECTORY_KEY =
  "onefc.android.downloads_saf_directory_uri";

/** SAF `createFileAsync`용 — 확장자 제외, 금지 문자 제거 */
export function sanitizeAndroidDownloadBaseName(displayName: string): string {
  const trimmed = displayName.trim() || "onefc-download.pdf";
  const withoutExt = trimmed.replace(/\.[^./\\]+$/i, "").trim();
  const safe = withoutExt.replace(/[\\/:*?"<>|]/g, "_").trim();
  const base = safe || `onefc-${Date.now()}`;
  return base.slice(0, 120);
}

async function resolveAndroidDownloadsDirectoryUri(): Promise<string> {
  const cached = await SecureStore.getItemAsync(
    ANDROID_DOWNLOADS_SAF_DIRECTORY_KEY,
  );
  if (cached) {
    return cached;
  }

  const permissions =
    await StorageAccessFramework.requestDirectoryPermissionsAsync(
      StorageAccessFramework.getUriForDirectoryInRoot("Download"),
    );
  if (!permissions.granted || !permissions.directoryUri) {
    throw new ApiError(
      "다운로드 폴더에 저장할 수 없습니다. 저장 위치를 선택해 주세요.",
      400,
    );
  }

  await SecureStore.setItemAsync(
    ANDROID_DOWNLOADS_SAF_DIRECTORY_KEY,
    permissions.directoryUri,
  );
  return permissions.directoryUri;
}

/**
 * cache `file://` 파일을 Android Downloads(SAF)로 복사한다. 공유 시트는 사용하지 않는다.
 */
export async function copyCacheFileToAndroidDownloads(
  cacheFileUri: string,
  displayName: string,
  mimeType: string,
): Promise<string> {
  const directoryUri = await resolveAndroidDownloadsDirectoryUri();
  const baseName = sanitizeAndroidDownloadBaseName(displayName);

  try {
    const targetUri = await StorageAccessFramework.createFileAsync(
      directoryUri,
      baseName,
      mimeType,
    );
    await FileSystem.copyAsync({ from: cacheFileUri, to: targetUri });
    return targetUri;
  } catch {
    await SecureStore.deleteItemAsync(ANDROID_DOWNLOADS_SAF_DIRECTORY_KEY);
    const retryDirectoryUri = await resolveAndroidDownloadsDirectoryUri();
    const targetUri = await StorageAccessFramework.createFileAsync(
      retryDirectoryUri,
      baseName,
      mimeType,
    );
    await FileSystem.copyAsync({ from: cacheFileUri, to: targetUri });
    return targetUri;
  }
}
