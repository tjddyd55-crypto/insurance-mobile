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
  return resolveSafeFooterPadding(basePadding, bottomInset, open);
}

/** Pure policy: nav-bar inset only while the keyboard is closed. */
export function resolveSafeFooterPadding(basePadding: number, bottomInset: number, keyboardOpen: boolean): number {
  return keyboardOpen ? basePadding : basePadding + bottomInset;
}

export function useKeyboardOpen(enabled = true): boolean {
  // autoFocus 입력은 마운트 직후 키보드를 띄우므로, 구독 전에 이미 열린 상태를 놓치지 않게 초기값/구독 시점에 확인한다.
  const [open, setOpen] = useState(() => enabled && Keyboard.isVisible());
  useEffect(() => {
    if (!enabled) return undefined;
    setOpen(Keyboard.isVisible());
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
