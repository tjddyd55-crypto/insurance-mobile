import { type ReactNode, useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Modal,
  type ModalProps,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAppTheme } from "../DesignSystemProvider";
import { useBottomSafeInset } from "../useBottomSafeInset";
import { consumeBackForKeyboard, resolveKeyboardLift } from "../modalKeyboard";

export type KeyboardAwareModalProps = Omit<
  ModalProps,
  "onRequestClose" | "children"
> & {
  children: ReactNode;
  /**
   * Primary actions (등록/게시하기/PDF 발급 …). Rendered OUTSIDE the content scroll, pinned to the bottom of
   * the modal so it sits directly above the keyboard when it is open and above the nav bar when closed.
   * Buttons left inside a ScrollView only scroll as far as the focused input, so they end up under the keyboard.
   * When `footer` is set, the content should not add its own bottom safe padding.
   */
  footer?: ReactNode;
  onRequestClose: () => void;
};

/**
 * Drop-in replacement for a plain RN <Modal> that contains text inputs (not ModalShell).
 * - Android Back: first Back with the keyboard open only dismisses the keyboard (same as ModalShell).
 * - Keyboard: RN <Modal> windows don't resize on Android edge-to-edge, so the content is lifted by
 *   the height the keyboard covers (shared `resolveModalKeyboardLayout`). Keyboard closed → no change.
 * - Fullscreen (non-transparent): header is kept below the status bar using insets measured inside the modal window.
 */
export function KeyboardAwareModal({
  children,
  footer,
  onRequestClose,
  transparent,
  visible,
  ...rest
}: KeyboardAwareModalProps) {
  return (
    <Modal
      {...rest}
      visible={visible}
      transparent={transparent}
      onRequestClose={() => {
        if (consumeBackForKeyboard()) return;
        onRequestClose();
      }}
    >
      <SafeAreaProvider>
        <KeyboardAwareModalFrame
          open={Boolean(visible)}
          isDialog={Boolean(transparent)}
          footer={footer}
        >
          {children}
        </KeyboardAwareModalFrame>
      </SafeAreaProvider>
    </Modal>
  );
}

function KeyboardAwareModalFrame({
  open,
  isDialog,
  footer,
  children,
}: {
  open: boolean;
  isDialog: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomSafeInset = useBottomSafeInset();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [closedHeight, setClosedHeight] = useState(0);
  const [height, setHeight] = useState(0);
  const keyboardOpen = keyboardInset > 0;

  useEffect(() => {
    if (!open) {
      setKeyboardInset(0);
      return;
    }
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
      const screenOverlap =
        Dimensions.get("screen").height - event.endCoordinates.screenY;
      setKeyboardOverlap(
        Math.max(
          event.endCoordinates.height,
          screenOverlap > 0 ? screenOverlap : 0,
        ),
      );
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [open]);

  const resizedBy =
    keyboardOpen && closedHeight > 0 ? Math.max(0, closedHeight - height) : 0;
  // RN <Modal> 창은 Android edge-to-edge·iOS 모두 키보드에 맞춰 줄지 않으므로 프레임 하단을 직접 비운다.
  const keyboardLift = resolveKeyboardLift(
    keyboardOpen,
    keyboardOverlap,
    resizedBy,
  );
  const lift =
    keyboardLift > 0 ? keyboardLift + (isDialog ? theme.spacing.sm : 0) : 0;

  return (
    <View
      style={[
        styles.frame,
        !isDialog && { paddingTop: insets.top },
        lift > 0 && { paddingBottom: lift },
      ]}
      onLayout={(event) => {
        const h = event.nativeEvent.layout.height;
        setHeight(h);
        if (!keyboardOpen) setClosedHeight(h);
      }}
    >
      <View style={styles.content}>{children}</View>
      {footer ? (
        <View
          testID="keyboard-aware-modal-footer"
          style={[
            styles.footer,
            {
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.sm,
              // keyboard open: the keyboard covers the nav bar → small gap only; closed: clear the nav bar.
              paddingBottom: theme.spacing.sm + (keyboardOpen ? 0 : bottomSafeInset),
              gap: theme.spacing.sm,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  content: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
