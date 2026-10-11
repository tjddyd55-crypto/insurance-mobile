import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

type OnefcAndroidDownloadsModule = {
  saveToDownloads(
    localFileUri: string,
    displayName: string,
    mimeType: string,
  ): Promise<string>;
};

const nativeModule =
  Platform.OS === "android"
    ? requireNativeModule<OnefcAndroidDownloadsModule>("OnefcAndroidDownloads")
    : null;

/**
 * Android 10+ MediaStore Downloads. 폴더 선택·공유 시트 없음.
 */
export async function saveLocalFileToAndroidDownloads(
  localFileUri: string,
  displayName: string,
  mimeType: string,
): Promise<string> {
  if (!nativeModule) {
    throw new Error("Android에서만 사용할 수 있습니다.");
  }
  const uri = await nativeModule.saveToDownloads(
    localFileUri,
    displayName.trim() || "onefc-download.pdf",
    mimeType || "application/octet-stream",
  );
  if (!uri) {
    throw new Error("다운로드 폴더에 저장하지 못했습니다.");
  }
  return uri;
}
