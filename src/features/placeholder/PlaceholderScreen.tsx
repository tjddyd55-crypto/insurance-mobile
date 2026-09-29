import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme/tokens';
import type { MenuImplementationMode } from '../../navigation/menuConfig';

export type PlaceholderScreenProps = {
  title: string;
  legacyWebPath?: string;
  nativePath?: string;
  mode?: MenuImplementationMode;
  status?: string;
};

export function PlaceholderScreen({
  title,
  legacyWebPath,
  nativePath,
  mode = 'NATIVE',
  status = 'NOT_STARTED',
}: PlaceholderScreenProps) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>준비 중 — M1 Foundation placeholder</Text>
        <View style={styles.meta}>
          <Badge label={mode} tone={mode === 'DISABLED' ? 'danger' : 'default'} />
          <Badge label={status} tone="warning" />
        </View>
        {legacyWebPath ? (
          <Text style={styles.row}>
            Legacy Web: <Text style={styles.mono}>{legacyWebPath}</Text>
          </Text>
        ) : null}
        {nativePath ? (
          <Text style={styles.row}>
            Native: <Text style={styles.mono}>{nativePath}</Text>
          </Text>
        ) : null}
        <Text style={styles.note}>가짜 데이터 없음. 본 기능은 후속 milestone에서 구현합니다.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, backgroundColor: colors.bgBase },
  card: { gap: spacing.md },
  title: typography.title,
  subtitle: typography.caption,
  meta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  row: typography.body,
  mono: { fontFamily: 'monospace', color: colors.primaryActive },
  note: { ...typography.caption, marginTop: spacing.sm },
});
