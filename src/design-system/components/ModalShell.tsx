import { type ReactNode, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  onRequestClose,
}: ModalShellProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDialog = presentation === 'dialog';
  const requestClose = () => {
    if (!busy && dismissOnAndroidBack) {
      onRequestClose();
    }
  };
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  );

  return (
    <Modal
      visible={open}
      animationType={isDialog ? 'fade' : 'slide'}
      transparent={isDialog}
      onRequestClose={requestClose}
    >
      <View style={[styles.modalRoot, isDialog && styles.dialogOverlay]}>
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
          edges={['top', 'left', 'right', 'bottom']}
          style={[styles.safe, isDialog && styles.dialogPanel]}
        >
          <KeyboardAvoidingView
            enabled={keyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboard}
          >
            <View style={styles.header}>
              <View style={styles.titleBlock}>
                <AppText variant="sectionTitle" numberOfLines={1}>
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
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
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
      padding: theme.spacing.xl,
      justifyContent: 'center',
      backgroundColor: theme.colors.overlay,
    },
    safe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    dialogPanel: {
      flex: 0,
      maxHeight: '90%',
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceElevated,
    },
    keyboard: {
      flex: 1,
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
    titleBlock: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    body: {
      flex: 1,
      padding: theme.layout.modalPadding,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.layout.modalPadding,
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
