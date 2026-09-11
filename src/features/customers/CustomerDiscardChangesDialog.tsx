import { useEffect, useMemo } from 'react';
import { BackHandler, Modal, StyleSheet, View } from 'react-native';

import { AppText, Button, useAppTheme, type AppTheme } from '../../design-system';

/** Discard-only confirm copy — no save action in this dialog. */
export const CUSTOMER_DISCARD_CHANGES_DIALOG_COPY = {
  title: '수정을 취소할까요?',
  body: '변경한 내용은 저장되지 않습니다.',
  continueEditing: '계속 수정',
  discard: '저장하지 않고 나가기',
} as const;

export type CustomerDiscardChangesDialogProps = {
  open: boolean;
  /** 계속 수정 */
  onContinueEditing: () => void;
  /** 저장하지 않고 나가기 — API 호출 없음 */
  onDiscard: () => void;
};

/**
 * 수정 취소 / back 시 draft 폐기 확인.
 * 저장 action은 제공하지 않는다 — 저장은 `변경 저장` 버튼만.
 */
export function CustomerDiscardChangesDialog({
  open,
  onContinueEditing,
  onDiscard,
}: CustomerDiscardChangesDialogProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onContinueEditing();
      return true;
    });
    return () => sub.remove();
  }, [onContinueEditing, open]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onContinueEditing}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <AppText variant="heading">{CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.title}</AppText>
          <AppText color="textSecondary">{CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.body}</AppText>
          <View style={styles.actions}>
            <Button
              label={CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.continueEditing}
              variant="secondary"
              onPress={onContinueEditing}
              style={styles.actionBtn}
            />
            <Button
              label={CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.discard}
              variant="danger"
              onPress={onDiscard}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    panel: {
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    actions: {
      flexDirection: 'column',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    actionBtn: {
      alignSelf: 'stretch',
    },
  });
}
