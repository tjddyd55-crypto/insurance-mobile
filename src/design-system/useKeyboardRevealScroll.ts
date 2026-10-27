import { type RefObject, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';
import { revealFocusedInput } from './keyboardScroll';

/**
 * Screen-level (non-modal) keyboard SSOT for a ScrollView on Android edge-to-edge, where the window does not
 * resize: returns the keyboard height to add as bottom content padding (so the content can scroll past the
 * keyboard) and scrolls the focused input into view when the keyboard opens.
 */
export function useKeyboardRevealScroll(scrollRef: RefObject<ScrollView | null>) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const scrollY = useRef(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      // keyboard top in window coords (screenY) – compared with measureInWindow of the ScrollView
      setKeyboardInset(Math.max(0, event.endCoordinates.height));
      // padding must be laid out before measuring/scrolling
      requestAnimationFrame(() => requestAnimationFrame(() => revealFocusedInput(scrollRef.current, scrollY.current, event.endCoordinates.screenY)));
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollRef]);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };
  return { keyboardInset, onScroll };
}
