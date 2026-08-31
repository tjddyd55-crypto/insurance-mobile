import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens';

type BadgeProps = {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

export function Badge({ label, tone = 'default' }: BadgeProps) {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={[styles.text, tone === 'default' ? styles.textDefault : styles.textOnTone]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  default: { backgroundColor: colors.bgSoft },
  success: { backgroundColor: colors.primarySoft },
  warning: { backgroundColor: '#fff7d6' },
  danger: { backgroundColor: '#fee2e2' },
  text: { fontSize: 11, fontWeight: '700' },
  textDefault: { color: colors.textSecondary },
  textOnTone: { color: colors.textPrimary },
});
