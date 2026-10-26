import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useBottomSafeInset } from '../useBottomSafeInset';

/**
 * Bottom padding that keeps content above the Android system navigation bar
 * (3-button or gesture) via `useBottomSafeInset`. While the keyboard is open the
 * keyboard already covers the nav bar, so the nav inset is NOT added.
 */
export function useSafeFooterPadding(basePadding = 0, keyboardOpen?: boolean): number {
  const bottomInset = useBottomSafeInset();
  const trackedKeyboardOpen = useKeyboardOpen(keyboardOpen === undefined);
  const open = keyboardOpen ?? trackedKeyboardOpen;
  return open ? basePadding : basePadding + bottomInset;
}

export function useKeyboardOpen(enabled = true): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [enabled]);
  return open;
}

export type SafeFooterProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra padding below the content, before the nav-bar inset. */
  basePadding?: number;
  /** Pass when the parent already tracks the keyboard; otherwise tracked internally. */
  keyboardOpen?: boolean;
  testID?: string;
};

export function SafeFooter({ children, style, basePadding = 0, keyboardOpen, testID }: SafeFooterProps) {
  const paddingBottom = useSafeFooterPadding(basePadding, keyboardOpen);
  return (
    <View testID={testID} style={[style, { paddingBottom }]}>
      {children}
    </View>
  );
}
