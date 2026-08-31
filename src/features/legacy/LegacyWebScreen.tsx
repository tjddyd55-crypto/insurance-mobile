import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme/tokens';

type LegacyWebScreenProps = {
  title: string;
  legacyWebPath: string;
};

/**
 * M1 skeleton only.
 * - No complex WebView wiring
 * - Never pass auth token via query string
 */
export function LegacyWebScreen({ title, legacyWebPath }: LegacyWebScreenProps) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>
          WebView temp bridge 대상입니다. M1에서는 WebView를 연결하지 않습니다.
        </Text>
        <Text style={styles.row}>
          legacyWebPath: <Text style={styles.mono}>{legacyWebPath}</Text>
        </Text>
        <Text style={styles.warn}>인증 토큰을 URL query로 전달하지 않습니다.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, backgroundColor: colors.bgBase },
  card: { gap: spacing.md },
  title: typography.title,
  body: typography.body,
  row: typography.caption,
  mono: { fontFamily: 'monospace', color: colors.primaryActive },
  warn: { ...typography.caption, color: colors.danger },
});
