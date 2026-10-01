import { requireOptionalNativeModule } from 'expo-modules-core';

/** Reads an installed Expo native module without throwing when it is absent. */
export function lookupNativeModule(moduleName: string): object | null {
  return requireOptionalNativeModule(moduleName);
}
