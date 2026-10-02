import { useEffect, useRef, type RefObject } from 'react';

/**
 * Android는 TextInput이 윈도우에 붙기 전에 focus()를 호출하면
 * showSoftInput을 무시한다. 레이아웃 이후 두 프레임 뒤에 포커스한다.
 */
export function focusTextInputAfterAttach(input: { focus: () => void } | null): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      input?.focus();
    });
  });
}

/** 편집이 켜진 뒤 첫 onLayout에서만 키보드를 연다. 이후 레이아웃은 다시 포커스하지 않는다. */
export function useFocusTextInputWhenAttached(
  editing: boolean,
  inputRef: RefObject<{ focus: () => void } | null>,
): () => void {
  const attachedFocusDone = useRef(false);

  useEffect(() => {
    if (editing) return;
    attachedFocusDone.current = false;
  }, [editing]);

  return () => {
    if (!editing || attachedFocusDone.current) return;
    const input = inputRef.current;
    if (!input) return;
    attachedFocusDone.current = true;
    focusTextInputAfterAttach(input);
  };
}
