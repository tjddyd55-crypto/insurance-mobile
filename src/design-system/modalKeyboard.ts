import { Keyboard } from "react-native";

export type ModalKeyboardLayoutInput = {
  isDialog: boolean;
  keyboardOpen: boolean;
  platform: string;
  /** 화면 하단에서 키보드가 덮는 높이(px, dp). */
  keyboardOverlap: number;
  /** 키보드로 인해 modal root 가 실제로 줄어든 높이(창 resize 가 일어난 경우). */
  resizedBy: number;
  keyboardInset: number;
  safeBottom: number;
  /** 다이얼로그 footer 와 키보드 사이 여백. */
  gap: number;
  modalPadding: number;
};

export type ModalKeyboardLayout = {
  /** modal root(KeyboardAvoidingView) paddingBottom. null 이면 기본 스타일 유지. */
  rootPaddingBottom: number | null;
  /** dialog footer paddingBottom override. null 이면 기본 스타일 유지. */
  dialogFooterPaddingBottom: number | null;
};

/**
 * ModalShell 키보드 레이아웃 SSOT.
 * Android edge-to-edge 에서 RN <Modal> 창은 키보드에 맞춰 resize 되지 않는다.
 * - fullscreen: root 를 키보드가 덮는 만큼 비운다(기존 동작).
 * - dialog: overlay 하단을 키보드 높이(+gap)만큼 비워, 패널이 키보드 바로 위에 붙고
 *   footer(취소/저장)가 키보드 바로 위에 보이게 한다. 패널은 남은 영역 안에서 줄어들고 body 가 스크롤된다.
 *   (이전: footer 내부 paddingBottom 만 늘려 패널이 여전히 키보드 뒤에 깔려 footer 가 가려졌다.)
 * - 키보드 닫힘: 아무것도 바꾸지 않는다(가운데 정렬/크기 유지).
 * - iOS: KeyboardAvoidingView(padding) 동작 유지.
 */
export function resolveModalKeyboardLayout(
  input: ModalKeyboardLayoutInput,
): ModalKeyboardLayout {
  const {
    isDialog,
    keyboardOpen,
    platform,
    keyboardOverlap,
    resizedBy,
    keyboardInset,
    safeBottom,
    gap,
    modalPadding,
  } = input;
  if (!keyboardOpen)
    return { rootPaddingBottom: null, dialogFooterPaddingBottom: null };
  const lift = Math.max(0, keyboardOverlap - Math.max(0, resizedBy));
  if (platform === "android") {
    if (isDialog)
      return { rootPaddingBottom: lift + gap, dialogFooterPaddingBottom: null };
    return {
      rootPaddingBottom: lift > 0 ? lift : null,
      dialogFooterPaddingBottom: null,
    };
  }
  if (isDialog) {
    return {
      rootPaddingBottom: null,
      dialogFooterPaddingBottom: Math.max(
        modalPadding,
        keyboardInset - safeBottom + gap,
      ),
    };
  }
  return { rootPaddingBottom: null, dialogFooterPaddingBottom: null };
}

/**
 * Modal Android Back 공통 처리: 키보드가 열려 있으면 첫 Back 은 키보드만 닫는다.
 * @returns true 면 Back 을 소비(키보드만 닫음)했고 모달은 유지해야 한다.
 */
export function consumeBackForKeyboard(
  keyboard: Pick<typeof Keyboard, "isVisible" | "dismiss"> = Keyboard,
): boolean {
  if (keyboard.isVisible()) {
    keyboard.dismiss();
    return true;
  }
  return false;
}
