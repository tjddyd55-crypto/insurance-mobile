import { useEffect, useMemo } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, useAppTheme, type AppTheme } from '../design-system';

export type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: 'default' | 'danger';
  /** SSOT: default false — backdrop must not auto-close confirm dialogs */
  closeOnBackdrop?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Confirm dialog policy (ONE FC SSOT):
 * - Backdrop touch does NOT close by default
 * - Android back: cancel only when closeOnBackdrop is explicitly true; otherwise ignore
 * - Busy locks actions
 */
export function ConfirmDialog({
  open,
  title = '확인',
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  busy = false,
  tone = 'default',
  closeOnBackdrop = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  useEffect(() => {
    if (!open) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) {
        return true;
      }
      if (closeOnBackdrop) {
        onCancel();
      }
      // Consume back while dialog is open to avoid accidental navigation
      return true;
    });
    return () => sub.remove();
  }, [open, busy, closeOnBackdrop, onCancel]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => {
      if (!busy && closeOnBackdrop) {
        onCancel();
      }
    }}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!busy && closeOnBackdrop) {
              onCancel();
            }
          }}
        />
        <View style={styles.panel}>
          <AppText variant="heading">{title}</AppText>
          <AppText color="textSecondary">{message}</AppText>
          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              variant="secondary"
              disabled={busy}
              onPress={onCancel}
              style={styles.actionBtn}
            />
            <Button
              label={confirmLabel}
              variant={tone === 'danger' ? 'danger' : 'primary'}
              loading={busy}
              disabled={busy}
              onPress={() => void onConfirm()}
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
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.xl },
    panel: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg, padding: theme.spacing.xl, gap: theme.spacing.md },
    actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    actionBtn: { flex: 1 },
  });
}
