import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CoverageShareListItem } from './coverageShareApi';
import { COVERAGE_SHARE_COPY, formatCoverageShareDate } from './coverageShareModel';
import { simulatorTheme as theme } from './simulatorTheme';

type Props = {
  shares: CoverageShareListItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCopyLink: (url: string | null) => void;
  onRevoke: (shareId: string) => void;
};

export function CoverageShareDialogHistory({
  shares,
  loading,
  error,
  onRetry,
  onCopyLink,
  onRevoke,
}: Props) {
  return (
    <View style={styles.section} accessibilityLabel={COVERAGE_SHARE_COPY.historyTitle}>
      <Text style={styles.title}>{COVERAGE_SHARE_COPY.historyTitle}</Text>
      {loading ? <Text style={styles.muted}>{COVERAGE_SHARE_COPY.historyLoading}</Text> : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.smallButton}>
            <Text style={styles.smallLabel}>{COVERAGE_SHARE_COPY.historyRetry}</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && !error && shares.length === 0 ? (
        <Text style={styles.muted}>{COVERAGE_SHARE_COPY.historyEmpty}</Text>
      ) : null}
      {!error && shares.length > 0 ? (
        <View>
          {shares.map((entry) => (
            <View key={entry.shareId} style={styles.item}>
              <View style={styles.meta}>
                <Text style={styles.metaText}>{formatCoverageShareDate(entry.createdAt)}</Text>
                {entry.revokedAt ? <Text style={styles.revoked}>{COVERAGE_SHARE_COPY.revoked}</Text> : null}
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!entry.shareUrl}
                  onPress={() => onCopyLink(entry.shareUrl)}
                  style={[styles.smallButton, !entry.shareUrl && styles.disabled]}
                >
                  <Text style={styles.smallLabel}>{COVERAGE_SHARE_COPY.copyLink}</Text>
                </Pressable>
                {!entry.revokedAt ? (
                  <Pressable accessibilityRole="button" onPress={() => onRevoke(entry.shareId)} style={styles.smallButton}>
                    <Text style={styles.smallLabel}>{COVERAGE_SHARE_COPY.revoke}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '700', color: theme.text },
  muted: { fontSize: 13, color: theme.muted },
  errorBox: { gap: 8 },
  error: { fontSize: 13, color: theme.muted },
  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 8,
  },
  meta: { gap: 2 },
  metaText: { fontSize: 13, color: theme.text },
  revoked: { fontSize: 13, color: theme.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: {
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallLabel: { fontSize: 13, fontWeight: '700', color: theme.text },
  disabled: { opacity: 0.45 },
});
