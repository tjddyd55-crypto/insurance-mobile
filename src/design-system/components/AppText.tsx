import { Text, type TextProps, type TextStyle } from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { SemanticColors } from '../themes';

export type AppTextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'button';

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: keyof SemanticColors;
  align?: TextStyle['textAlign'];
};

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  ...rest
}: AppTextProps) {
  const theme = useAppTheme();
  return (
    <Text
      style={[
        theme.typography[variant],
        color ? { color: theme.colors[color] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
