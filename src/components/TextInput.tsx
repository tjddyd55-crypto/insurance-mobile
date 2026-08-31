import { StyleSheet, Text, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextInput({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <RNTextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: typography.label,
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSurface,
    color: colors.textPrimary,
    fontSize: 15,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
