import { useMemo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
} from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';

export type IconButtonSize = 'sm' | 'md';
export type IconButtonVariant = 'outlined' | 'ghost';
export type IconButtonTone = 'default' | 'primary' | 'danger';

export type IconButtonProps = Omit<PressableProps, 'children' | 'accessibilityLabel'> & {
  accessibilityLabel: string;
  icon: (color: string) => ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  tone?: IconButtonTone;
};

export function IconButton({
  accessibilityLabel,
  icon,
  size = 'sm',
  variant = 'outlined',
  tone = 'default',
  disabled,
  hitSlop,
  style,
  ...rest
}: IconButtonProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const color =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'danger'
        ? theme.colors.danger
        : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop ?? (size === 'sm' ? theme.interaction.compactHitSlop : undefined)}
      style={(state) => [
        styles.base,
        styles[size],
        styles[variant],
        state.pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {icon(color)}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.lg,
    },
    sm: {
      width: theme.density.compact.controlVisualHeight,
      height: theme.density.compact.controlVisualHeight,
    },
    md: {
      width: theme.density.normal.controlVisualHeight,
      height: theme.density.normal.controlVisualHeight,
    },
    outlined: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    ghost: {
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    pressed: {
      opacity: theme.opacity.pressed,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
  });
}
