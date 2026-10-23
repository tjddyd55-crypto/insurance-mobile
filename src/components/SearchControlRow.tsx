import { useMemo, type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

import {
  Button,
  Inline,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../design-system';

type SearchControlRowProps = {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  accessibilityLabel?: string;
  trailing?: ReactNode;
  containerStyle?: ViewStyle;
  /** false = 입력 즉시 검색 화면 (검색 버튼 숨김). 기본 true. */
  showSearchButton?: boolean;
};

/**
 * Native search row SSOT — input + 검색 button share `controlSize.md` (44px).
 */
export function SearchControlRow({
  placeholder,
  value,
  onChangeText,
  onSubmit,
  accessibilityLabel,
  trailing,
  containerStyle,
  showSearchButton = true,
}: SearchControlRowProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Inline gap="sm" align="stretch" style={[styles.row, containerStyle]}>
      <TextField
        accessibilityLabel={accessibilityLabel ?? '검색'}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCorrect={false}
        containerStyle={styles.field}
      />
      {showSearchButton ? (
        <Button
          label="검색"
          size="md"
          variant="secondary"
          onPress={onSubmit}
          style={styles.searchButton}
        />
      ) : null}
      {trailing}
    </Inline>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: { width: '100%' },
    field: { flex: 1, minWidth: 0 },
    searchButton: {
      minWidth: 72,
      alignSelf: 'stretch',
    },
  });
}
