import { useEffect } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CoverageShareListItem } from './coverageShareApi';
import { CoverageShareDialogHistory } from './CoverageShareDialogHistory';
import { COVERAGE_SHARE_COPY } from './coverageShareModel';
import { CoveragePrimaryButton, CoverageSecondaryButton } from './CoverageSimulatorChrome';
import { simulatorTheme as theme } from './simulatorTheme';

type Props = {
  open: boolean;
  loading: boolean;
  createError: string | null;
  shareUrl: string | null;
  historyShares: CoverageShareListItem[];
  historyLoading: boolean;
  historyError: string | null;
  onClose: () => void;
  onCopyLink: () => void;
  onNativeShare: () => void;
  onRetryHistory: () => void;
  onCopyHistoryLink: (url: string | null) => void;
  onRevokeShare: (shareId: string) => void;
};

export function CoverageShareDialog({
  open,
  loading,
  createError,
  shareUrl,
  historyShares,
  historyLoading,
  historyError,
  onClose,
  onCopyLink,
  onNativeShare,
  onRetryHistory,
  onCopyHistoryLink,
  onRevokeShare,
}: Props) {
  useEffect(() => {
    if (!open) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!loading) onClose();
      return true;
    });
    return () => sub.remove();
  }, [loading, onClose, open]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { if (!loading) onClose(); }}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={() => { if (!loading) onClose(); }}
        />
        <View style={styles.panel} accessibilityLabel={COVERAGE_SHARE_COPY.dialogTitle}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{COVERAGE_SHARE_COPY.dialogTitle}</Text>
            <Text style={styles.message}>{COVERAGE_SHARE_COPY.dialogBody}</Text>
            {createError ? <Text style={styles.error}>{createError}</Text> : null}
            {shareUrl ? (
              <TextInput
                style={styles.url}
                value={shareUrl}
                editable={false}
                selectTextOnFocus
                accessibilityLabel={COVERAGE_SHARE_COPY.urlLabel}
              />
            ) : null}
            <CoverageShareDialogHistory
              shares={historyShares}
              loading={historyLoading}
              error={historyError}
              onRetry={onRetryHistory}
              onCopyLink={onCopyHistoryLink}
              onRevoke={onRevokeShare}
            />
          </ScrollView>
          <View style={styles.actions}>
            <View style={styles.action}>
              <CoverageSecondaryButton
                label={loading ? COVERAGE_SHARE_COPY.copyLinkBusy : COVERAGE_SHARE_COPY.copyLink}
                disabled={loading}
                onPress={onCopyLink}
              />
            </View>
            <View style={styles.action}>
              <CoverageSecondaryButton
                label={COVERAGE_SHARE_COPY.nativeShare}
                disabled={loading}
                onPress={onNativeShare}
              />
            </View>
            <View style={styles.action}>
              <CoveragePrimaryButton
                label={COVERAGE_SHARE_COPY.close}
                disabled={loading}
                onPress={onClose}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    width: '90%',
    maxWidth: 448,
    alignSelf: 'center',
    maxHeight: '86%',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
  },
  body: { gap: 0 },
  title: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.text,
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    color: theme.danger,
  },
  url: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  action: { flex: 1 },
});
