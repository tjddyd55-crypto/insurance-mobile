import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';
import { AppText } from './AppText';
import { Button } from './Button';
import { ModalShell } from './ModalShell';

export type SelectFieldOption = {
  value: string;
  label: string;
};

export type SelectFieldProps = {
  label?: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  testID?: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = '선택해 주세요',
  error,
  helperText,
  required = false,
  disabled = false,
  containerStyle,
  testID,
}: SelectFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label || placeholder;
  const isPlaceholder = !selected || !String(selected.value).trim();

  return (
    <View style={[styles.wrap, containerStyle]} testID={testID}>
      {label ? (
        <AppText variant="label">
          {label}
          {required ? <AppText color="danger"> *</AppText> : null}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} 선택` : '선택'}
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={[
          styles.field,
          error && styles.fieldError,
          disabled && styles.fieldDisabled,
        ]}
        onPress={() => setOpen(true)}
      >
        <AppText
          color={isPlaceholder ? 'textMuted' : 'text'}
          style={styles.value}
          numberOfLines={1}
        >
          {displayLabel}
        </AppText>
        <AppText color="textSecondary">▼</AppText>
      </Pressable>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption">{helperText}</AppText>
      ) : null}

      <ModalShell
        open={open}
        title={label || '선택'}
        presentation="dialog"
        closeOnBackdrop
        onRequestClose={() => setOpen(false)}
        headerAction={
          <Button label="닫기" size="sm" variant="ghost" onPress={() => setOpen(false)} />
        }
      >
        <View style={styles.optionList}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value || 'empty'}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <AppText style={styles.optionLabel} numberOfLines={2}>
                  {option.label}
                </AppText>
                {isSelected ? (
                  <AppText color="primary" variant="bodyStrong">
                    ✓
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ModalShell>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xs },
    field: {
      minHeight: theme.controlSize.md,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    fieldError: { borderColor: theme.colors.danger },
    fieldDisabled: {
      backgroundColor: theme.colors.disabledBackground,
      opacity: theme.opacity.disabled,
    },
    value: { flex: 1 },
    optionList: { gap: theme.spacing.sm },
    option: {
      minHeight: theme.controlSize.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    optionLabel: { flex: 1 },
  });
}
