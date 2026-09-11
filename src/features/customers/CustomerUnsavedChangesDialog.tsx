import { useEffect, useMemo } from 'react';
import { BackHandler, Modal, StyleSheet, View } from 'react-native';

import { AppText, Button, useAppTheme, type AppTheme } from '../../design-system';

export type CustomerUnsavedChangesChoice = 'save' | 'discard' | 'cancel';

type CustomerUnsavedChangesDialogProps = {
  open: boolean;
  busy?: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
};

export function CustomerUnsavedChangesDialog({
  open,
  busy = false,
  onSave,
  onDiscard,
  onCancel,
}: CustomerUnsavedChangesDialogProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) {
        onCancel();
      }
      return true;
    });
    return () => sub.remove();
  }, [busy, onCancel, open]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => {
      if (!busy) {
        onCancel();
      }
    }}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <AppText variant="heading">변경사항 닫기</AppText>
          <AppText color="textSecondary">
            변경사항이 저장되지 않았습니다. 어떻게 하시겠습니까?
          </AppText>
          <View style={styles.actions}>
            <Button
              label="취소"
              variant="secondary"
              disabled={busy}
              onPress={onCancel}
              style={styles.actionBtn}
            />
            <Button
              label="저장안함"
              variant="danger"
              disabled={busy}
              onPress={onDiscard}
              style={styles.actionBtn}
            />
            <Button
              label="저장"
              variant="actionEmphasis"
              loading={busy}
              disabled={busy}
              onPress={() => void onSave()}
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
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    actionBtn: {
      flex: 1,
      minWidth: 0,
    },
  });
}
