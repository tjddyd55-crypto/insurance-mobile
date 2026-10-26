import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';
import { revealFocusedInput } from '../keyboardScroll';
import { useBottomSafeInset } from '../useBottomSafeInset';
import { AppText } from './AppText';

export type ModalShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  presentation?: 'fullscreen' | 'dialog';
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  busy?: boolean;
  closeOnBackdrop?: boolean;
  dismissOnAndroidBack?: boolean;
  /** Dialog-only sizing overrides. Defaults preserve existing modal behavior. */
  dialogMaxHeight?: `${number}%`;
  dialogWidth?: `${number}%`;
  dialogBodyPadding?: number;
  dialogOverlayPaddingVertical?: number;
  dialogOverlayPaddingHorizontal?: number;
  dialogHeaderCompact?: boolean;
  onRequestClose: () => void;
};

/**
 * Shared modal structure only; feature forms continue to own validation and save behavior.
 * ConfirmDialog remains separate because it intentionally consumes Android back by default.
 */
export function ModalShell(props: ModalShellProps) {
  return (
    <Modal
      visible={props.open}
      animationType={props.presentation === 'dialog' ? 'fade' : 'slide'}
      transparent={props.presentation === 'dialog'}
      statusBarTranslucent={props.presentation === 'dialog'}
      onRequestClose={() => {
        // 키보드가 열린 상태의 뒤로가기는 키보드만 닫는다(폼 전체를 닫지 않음).
        if (Keyboard.isVisible()) {
          Keyboard.dismiss();
          return;
        }
        if (!props.busy && (props.dismissOnAndroidBack ?? true)) {
          props.onRequestClose();
        }
      }}
    >
      {/* RN <Modal> is a separate Android window: re-measure safe-area insets inside it. */}
      <SafeAreaProvider>
        <ModalShellContent {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function ModalShellContent({
  open,
  title,
  subtitle,
  children,
  headerAction,
  footer,
  presentation = 'fullscreen',
  scroll = true,
  keyboardAvoiding = true,
  busy = false,
  closeOnBackdrop = false,
  dismissOnAndroidBack = true,
  dialogMaxHeight,
  dialogWidth,
  dialogBodyPadding,
  dialogOverlayPaddingVertical,
  dialogOverlayPaddingHorizontal,
  dialogHeaderCompact = false,
  onRequestClose,
}: ModalShellProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomSafeInset = useBottomSafeInset();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const isDialog = presentation === 'dialog';
  const resolvedBodyPadding = dialogBodyPadding ?? theme.layout.modalPadding;
  const keyboardOpen = keyboardInset > 0;
  // Android edge-to-edge: RN <Modal> 창은 키보드에 맞춰 줄지 않으므로, 키보드가 가리는 만큼을 직접 비운다.
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [closedRootHeight, setClosedRootHeight] = useState(0);
  const [rootHeight, setRootHeight] = useState(0);
  const resizedBy = keyboardOpen && closedRootHeight > 0 ? Math.max(0, closedRootHeight - rootHeight) : 0;
  const fullscreenKeyboardPadding =
    !isDialog && keyboardOpen && Platform.OS === 'android' ? Math.max(0, keyboardOverlap - resizedBy) : 0;

  useEffect(() => {
    if (!open) {
      setKeyboardInset(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
      const screenOverlap = Dimensions.get('screen').height - event.endCoordinates.screenY;
      setKeyboardOverlap(Math.max(event.endCoordinates.height, screenOverlap > 0 ? screenOverlap : 0));
      if (scroll) {
        requestAnimationFrame(() => {
          // 포커스된 입력이 보이도록만 스크롤(맨 끝 스크롤은 상단 필드를 밀어냈음). 포커스 입력이 없을 때만 끝으로.
          if (!revealFocusedInput(scrollRef.current, scrollYRef.current)) {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        });
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [open, scroll]);

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      scrollEventThrottle={16}
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
      }}
      onLayout={() => {
        // 키보드 패딩으로 보이는 영역이 줄어든 뒤 다시 포커스 입력을 확인한다.
        if (keyboardOpen) revealFocusedInput(scrollRef.current, scrollYRef.current);
      }}
      style={isDialog ? styles.dialogScroll : undefined}
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: resolvedBodyPadding,
          paddingBottom:
            resolvedBodyPadding +
            (keyboardOpen ? theme.spacing.lg : 0) +
            (!isDialog && !footer && !keyboardOpen ? bottomSafeInset : 0),
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.body,
        { padding: resolvedBodyPadding },
        !isDialog && !footer && !keyboardOpen
          ? { paddingBottom: resolvedBodyPadding + bottomSafeInset }
          : null,
        isDialog ? styles.dialogBody : styles.bodyFill,
      ]}
    >
      {children}
    </View>
  );

  return (
    <>
      <KeyboardAvoidingView
        enabled={keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          setRootHeight(height);
          if (!keyboardOpen) setClosedRootHeight(height);
        }}
        style={[
          styles.modalRoot,
          fullscreenKeyboardPadding > 0 && { paddingBottom: fullscreenKeyboardPadding },
          isDialog && styles.dialogOverlay,
          isDialog && keyboardOpen && styles.dialogOverlayKeyboardOpen,
          isDialog && {
            paddingVertical: dialogOverlayPaddingVertical ?? theme.spacing.xl,
            paddingHorizontal: dialogOverlayPaddingHorizontal ?? theme.spacing.xl,
          },
        ]}
      >
        {isDialog ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="모달 배경"
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!busy && closeOnBackdrop) {
                onRequestClose();
              }
            }}
          />
        ) : null}
        <SafeAreaView
          edges={isDialog ? ['left', 'right'] : ['top', 'left', 'right']}
          style={[
            styles.safe,
            isDialog && styles.dialogPanel,
            isDialog && dialogMaxHeight ? { maxHeight: dialogMaxHeight } : null,
            isDialog && dialogWidth ? { width: dialogWidth, alignSelf: 'center' } : null,
            isDialog && keyboardOpen && styles.dialogPanelKeyboardOpen,
          ]}
        >
          <View style={isDialog ? styles.dialogContent : styles.keyboard}>
            <View style={[styles.header, dialogHeaderCompact && styles.headerCompact]}>
              <View style={styles.titleBlock}>
                <AppText
                  variant={dialogHeaderCompact ? 'bodyStrong' : 'sectionTitle'}
                  numberOfLines={1}
                >
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText variant="helper" numberOfLines={2}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              {headerAction}
            </View>
            {body}
            {footer ? (
              <View
                style={[
                  styles.footer,
                  !isDialog &&
                    !keyboardOpen && {
                      // Fullscreen: keep footer buttons above the system nav bar. With the
                      // keyboard open the keyboard covers the nav bar, so follow it only.
                      paddingBottom: theme.layout.modalPadding + bottomSafeInset,
                    },
                  isDialog &&
                    keyboardOpen && {
                      paddingBottom: Math.max(
                        theme.layout.modalPadding,
                        keyboardInset - insets.bottom + theme.spacing.sm,
                      ),
                    },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalRoot: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    dialogOverlay: {
      justifyContent: 'center',
      backgroundColor: theme.colors.overlay,
    },
    dialogOverlayKeyboardOpen: {
      justifyContent: 'flex-end',
      paddingBottom: theme.spacing.sm,
    },
    safe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    dialogPanel: {
      flex: 0,
      width: '100%',
      maxHeight: '90%',
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceElevated,
      zIndex: 1,
    },
    dialogPanelKeyboardOpen: {
      maxHeight: '82%',
    },
    keyboard: {
      flex: 1,
    },
    dialogContent: {
      flexGrow: 0,
      flexShrink: 1,
      maxHeight: '100%',
    },
    dialogScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    header: {
      minHeight: theme.layout.modalHeaderHeight,
      paddingHorizontal: theme.layout.modalPadding,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerCompact: {
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    body: {},
    bodyFill: {
      flex: 1,
    },
    dialogBody: {
      flexGrow: 0,
      flexShrink: 1,
    },
    scrollContent: {
      flexGrow: 1,
      gap: theme.layout.sectionGap,
    },
    footer: {
      padding: theme.layout.modalPadding,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  });
}
