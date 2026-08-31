import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens';

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({
  label,
  loading,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        state.pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.textOnPrimary} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.secondaryLabel,
            variant === 'danger' && styles.dangerLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  label: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 15 },
  secondaryLabel: { color: colors.textPrimary },
  dangerLabel: { color: colors.textOnPrimary },
});
