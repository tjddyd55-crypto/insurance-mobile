import { lookupNativeModule } from './nativeModuleLookup';

/**
 * expo-print and expo-sharing call requireNativeModule when their package entry is evaluated.
 * The store binary 1.0.3 (versionCode 6) has no ExpoPrint. A top-level import would crash
 * PDF preview on that binary if this JS arrived through OTA. Confirm the native module,
 * then load the package only when it is actually installed.
 */
export const PDF_SAVE_REQUIRES_APP_UPDATE =
  'PDF 저장은 앱을 최신 버전으로 업데이트한 후 사용할 수 있습니다.';

export const EXPO_PRINT_NATIVE_MODULE = 'ExpoPrint';
export const EXPO_SHARING_NATIVE_MODULE = 'ExpoSharing';

export function isNativeModuleInstalled(moduleName: string): boolean {
  return lookupNativeModule(moduleName) != null;
}

export function assertPdfExportNativeModules(): void {
  const printReady = isNativeModuleInstalled(EXPO_PRINT_NATIVE_MODULE);
  const sharingReady = isNativeModuleInstalled(EXPO_SHARING_NATIVE_MODULE);
  if (!printReady || !sharingReady) {
    throw new Error(PDF_SAVE_REQUIRES_APP_UPDATE);
  }
}

export function loadExpoPrint(): typeof import('expo-print') {
  if (!isNativeModuleInstalled(EXPO_PRINT_NATIVE_MODULE)) {
    throw new Error(PDF_SAVE_REQUIRES_APP_UPDATE);
  }
  // Package entry calls requireNativeModule('ExpoPrint') while it evaluates.
  // Keep this require inside the function so old binaries never evaluate it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-print') as typeof import('expo-print');
}

export function loadExpoSharing(): typeof import('expo-sharing') {
  if (!isNativeModuleInstalled(EXPO_SHARING_NATIVE_MODULE)) {
    throw new Error(PDF_SAVE_REQUIRES_APP_UPDATE);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-sharing') as typeof import('expo-sharing');
}
