import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from './foundations';

/**
 * Android edge-to-edge builds often report `insets.bottom === 0` even when
 * 3-button navigation overlaps app content. Use a floor only in that case.
 */
export function resolveBottomSafeInset(
  bottom: number,
  platform: typeof Platform.OS = Platform.OS,
  androidFallback = layout.contentBottomInset,
): number {
  if (platform !== 'android') return bottom;
  return bottom > 0 ? bottom : androidFallback;
}

export function useBottomSafeInset(androidFallback = layout.contentBottomInset): number {
  const { bottom } = useSafeAreaInsets();
  return resolveBottomSafeInset(bottom, Platform.OS, androidFallback);
}

export function useContentBottomPadding(
  contentInset = layout.contentBottomInset,
  androidFallback = layout.contentBottomInset,
): number {
  return contentInset + useBottomSafeInset(androidFallback);
}
