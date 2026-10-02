import { Dimensions } from 'react-native';
import type { RefObject } from 'react';
import type { ScrollView, View } from 'react-native';

/** Nudge scroll so the inline amount row stays above the keyboard. */
export function scrollInlineAmountIntoView(
  scrollRef: RefObject<ScrollView | null>,
  anchorRef: RefObject<View | null>,
  keyboardInset: number,
  scrollYOffset: number,
  onProgrammaticScroll?: () => void,
): void {
  const scroll = scrollRef.current;
  const anchor = anchorRef.current;
  if (!scroll || !anchor || keyboardInset <= 0) return;

  const windowHeight = Dimensions.get('window').height;
  const scrollOnce = () => {
    anchor.measureInWindow((_x, y, _w, height) => {
      const visibleBottom = windowHeight - keyboardInset;
      const fieldBottom = y + height;
      const padding = 32;
      if (fieldBottom + padding <= visibleBottom) return;
      const delta = fieldBottom + padding - visibleBottom;
      onProgrammaticScroll?.();
      scroll.scrollTo({ y: Math.max(0, scrollYOffset + delta), animated: true });
    });
  };

  scrollOnce();
  setTimeout(scrollOnce, 120);
  setTimeout(scrollOnce, 320);
}
