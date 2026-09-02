import { useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';
import { AppText } from './AppText';
import {
  resolveButtonContentColor,
  resolveButtonSurfaceStyle,
} from './buttonPresentation';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'selected'
  | 'danger'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function Button({
  label,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leading,
  trailing,
  disabled,
  hitSlop,
  style,
  ...rest
}: ButtonProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDisabled = Boolean(disabled || loading);
  const surface = resolveButtonSurfaceStyle(theme, variant);
  const contentColor = resolveButtonContentColor(theme, variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={hitSlop ?? (size === 'sm' ? theme.interaction.compactHitSlop : undefined)}
      style={(state) => [
        styles.base,
        styles[size],
        {
          backgroundColor: surface.backgroundColor,
          borderColor: surface.borderColor,
        },
        fullWidth && styles.fullWidth,
        state.pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {leading}
          <AppText variant="button" style={{ color: contentColor }} numberOfLines={1}>
            {label}
          </AppText>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      borderWidth: 1,
    },
    sm: { minHeight: theme.controlSize.sm, paddingHorizontal: theme.spacing.md },
    md: { minHeight: theme.controlSize.md },
    lg: { minHeight: theme.controlSize.lg, paddingHorizontal: theme.spacing.xl },
    fullWidth: { alignSelf: 'stretch' },
    pressed: { opacity: theme.opacity.pressed },
    disabled: { opacity: theme.opacity.disabled },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
  });
}
