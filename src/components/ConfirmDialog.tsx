import { useEffect } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  panel: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: typography.heading,
  message: { ...typography.body, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});
