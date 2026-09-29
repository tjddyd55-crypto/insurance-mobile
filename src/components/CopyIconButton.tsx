import { SymbolView } from 'expo-symbols';

import { IconButton, useAppTheme } from '../design-system';

export function CopyIconButton({
  accessibilityLabel,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const color = disabled ? theme.colors.textDisabled : theme.colors.primary;

  return (
    <IconButton
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      variant="outlined"
      size="sm"
      onPress={onPress}
      icon={() => (
        <SymbolView
          name={{ ios: 'doc.on.doc', android: 'content_copy' }}
          size={18}
          tintColor={color}
          fallback={
            <SymbolView
              name={{ ios: 'square.on.square', android: 'content_copy' }}
              size={18}
              tintColor={color}
            />
          }
        />
      )}
    />
  );
}
