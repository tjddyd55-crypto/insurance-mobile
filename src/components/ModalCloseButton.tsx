import { SymbolView } from 'expo-symbols';

import { IconButton, useAppTheme } from '../design-system';

type ModalCloseButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function ModalCloseButton({
  onPress,
  accessibilityLabel = '닫기',
}: ModalCloseButtonProps) {
  const theme = useAppTheme();

  return (
    <IconButton
      accessibilityLabel={accessibilityLabel}
      variant="outlined"
      size="md"
      onPress={onPress}
      icon={(color) => (
        <SymbolView
          name={{ ios: 'xmark', android: 'close' }}
          size={18}
          tintColor={color}
        />
      )}
      style={{
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    />
  );
}
