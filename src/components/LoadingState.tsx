import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';

export function LoadingState({ message = '불러오는 중…' }: { message?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: typography.caption,
});
