import { useMemo, useState } from 'react';
import {
  StyleSheet,
  TextInput as NativeTextInput,
  View,
  type TextInputProps as NativeTextInputProps,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';
import { AppText } from './AppText';

export type TextFieldProps = NativeTextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
};

export function TextField({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: TextFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <AppText variant="label">
          {label}
          {required ? <AppText color="danger"> *</AppText> : null}
        </AppText>
      ) : null}
      <NativeTextInput
        accessibilityLabel={rest.accessibilityLabel ?? label}
        accessibilityState={{ disabled: !editable }}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        editable={editable}
        style={[
          styles.input,
          rest.multiline && styles.multiline,
          focused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
          style,
        ]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption">{helperText}</AppText>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xs },
    input: {
      minHeight: theme.controlSize.md,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.body.fontSize,
      lineHeight: theme.typography.body.lineHeight,
    },
    inputFocused: { borderColor: theme.colors.inputFocusBorder, borderWidth: 2 },
    inputError: { borderColor: theme.colors.danger },
    inputDisabled: { backgroundColor: theme.colors.disabledBackground, color: theme.colors.textDisabled },
    multiline: {
      minHeight: 112,
      paddingVertical: theme.spacing.md,
      textAlignVertical: 'top',
    },
  });
}
