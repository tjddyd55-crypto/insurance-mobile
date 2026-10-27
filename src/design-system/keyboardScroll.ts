import { TextInput, type ScrollView } from 'react-native';

/**
 * Where to scroll so a field (measured relative to the visible scroll viewport) is fully visible.
 * Returns null when the field is already visible. Fields taller than the viewport align to top.
 */
export function scrollOffsetToReveal(input: {
  fieldTop: number;
  fieldHeight: number;
  viewportHeight: number;
  scrollY: number;
  margin?: number;
}): number | null {
  const { fieldTop, fieldHeight, viewportHeight, scrollY, margin = 16 } = input;
  if (viewportHeight <= 0) return null;
  const fieldBottom = fieldTop + fieldHeight;
  if (fieldTop < margin || fieldHeight + margin * 2 > viewportHeight) {
    if (fieldTop >= margin && fieldBottom <= viewportHeight) return null;
    return Math.max(0, scrollY + fieldTop - margin);
  }
  if (fieldBottom > viewportHeight - margin) return Math.max(0, scrollY + fieldBottom - viewportHeight + margin);
  return null;
}

type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

/**
 * Keyboard-open scroll policy: keep the focused TextInput inside the scroll viewport.
 * (Replaces "scroll to end", which pushed fields near the top out of view.)
 * Returns false when no focused input is inside this ScrollView.
 */
export function revealFocusedInput(scroll: ScrollView | null, scrollY: number, keyboardTopY?: number): boolean {
  const focused = TextInput.State.currentlyFocusedInput() as unknown as Measurable | null;
  const native = scroll?.getNativeScrollRef?.() as unknown as Measurable | null;
  if (!scroll || !focused || !native) return false;
  native.measureInWindow((_sx, sy, _sw, sh) => {
    focused.measureInWindow((_fx, fy, _fw, fh) => {
      const top = fy - sy;
      // 탭한 입력은 키보드 전에는 화면 안에 있었으므로, 멀리 벗어난 값이면 이 ScrollView 밖의 입력이다.
      if (top < -sh || top > sh * 2) return;
      // 창이 리사이즈되지 않는 경우(Android edge-to-edge 화면) 키보드에 덮인 아래쪽은 보이지 않는 영역으로 본다.
      const viewportHeight = keyboardTopY != null && keyboardTopY > 0 ? Math.min(sh, keyboardTopY - sy) : sh;
      const target = scrollOffsetToReveal({ fieldTop: top, fieldHeight: fh, viewportHeight, scrollY });
      if (target !== null) scroll.scrollTo({ y: target, animated: true });
    });
  });
  return true;
}
