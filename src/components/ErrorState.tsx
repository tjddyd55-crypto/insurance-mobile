import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = '오류', message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button label="다시 시도" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: { ...typography.heading, color: colors.danger },
  message: { ...typography.body, textAlign: 'center', color: colors.textSecondary },
});
