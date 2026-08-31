import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../theme/tokens';

export function EmptyState({ title = '항목 없음', message }: { title?: string; message?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: typography.heading,
  message: { ...typography.caption, textAlign: 'center' },
});
