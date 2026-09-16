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

export function VisibilityIconButton({
  accessibilityLabel,
  revealed,
  onPress,
}: {
  accessibilityLabel: string;
  revealed: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const color = theme.colors.textSecondary;

  return (
    <IconButton
      accessibilityLabel={accessibilityLabel}
      variant="outlined"
      size="sm"
      onPress={onPress}
      icon={() => (
        <SymbolView
          name={
            revealed
              ? { ios: 'eye.slash', android: 'visibility_off' }
              : { ios: 'eye', android: 'visibility' }
          }
          size={18}
          tintColor={color}
        />
      )}
    />
  );
}
