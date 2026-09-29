import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';
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
export function ModalShell({
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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const isDialog = presentation === 'dialog';
  const resolvedBodyPadding = dialogBodyPadding ?? theme.layout.modalPadding;
  const keyboardOpen = keyboardInset > 0;

  useEffect(() => {
    if (!open) {
      setKeyboardInset(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
      if (scroll) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
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

  const requestClose = () => {
    if (!busy && dismissOnAndroidBack) {
      onRequestClose();
    }
  };
  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={isDialog ? styles.dialogScroll : undefined}
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: resolvedBodyPadding,
          paddingBottom: resolvedBodyPadding + (keyboardOpen ? theme.spacing.lg : 0),
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
        isDialog ? styles.dialogBody : styles.bodyFill,
      ]}
    >
      {children}
    </View>
  );

  return (
    <Modal
      visible={open}
      animationType={isDialog ? 'fade' : 'slide'}
      transparent={isDialog}
      statusBarTranslucent={isDialog}
      onRequestClose={requestClose}
    >
      <KeyboardAvoidingView
        enabled={keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.modalRoot,
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
          edges={isDialog ? ['left', 'right'] : ['top', 'left', 'right', 'bottom']}
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
    </Modal>
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
