import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';

type Space = keyof AppTheme['spacing'];

export type StackProps = ViewProps & { children: ReactNode; gap?: Space };

export function Stack({ children, gap = 'md', style, ...rest }: StackProps) {
  const theme = useAppTheme();
  return (
    <View style={[{ gap: theme.spacing[gap] }, style]} {...rest}>
      {children}
    </View>
  );
}

export type InlineProps = StackProps & {
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  wrap?: boolean;
};

export function Inline({
  children,
  gap = 'sm',
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
  ...rest
}: InlineProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        { flexDirection: 'row', gap: theme.spacing[gap], alignItems: align, justifyContent: justify },
        wrap && styles.wrap,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function Divider({ style, ...rest }: ViewProps) {
  const theme = useAppTheme();
  const dividerStyle = useMemo(
    () => ({ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }),
    [theme],
  );
  return <View style={[dividerStyle, style]} {...rest} />;
}

const styles = StyleSheet.create({ wrap: { flexWrap: 'wrap' } });
