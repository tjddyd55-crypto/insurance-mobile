import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Inline,
  ModalShell,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import {
  allPages,
  displayPageSelection,
  formatSelectedPages,
  parsePageRangeInput,
  togglePageSelection,
} from './personalBinderModel';

type Props = {
  open: boolean;
  title: string;
  pageCount: number;
  initialSelection: number[] | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (selection: number[]) => void;
};

export function BinderPageSelectionModal({
  open,
  title,
  pageCount,
  initialSelection,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selected, setSelected] = useState<number[]>([]);
  const [range, setRange] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const next = displayPageSelection(initialSelection, pageCount);
    setSelected(next);
    setRange(formatSelectedPages(next));
    setError('');
  }, [open, initialSelection, pageCount]);

  const applyRange = () => {
    const parsed = parsePageRangeInput(range, pageCount);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSelected(parsed.pages);
    setError('');
  };

  return (
    <ModalShell
      open={open}
      title="페이지 선택"
      subtitle={title}
      presentation="dialog"
      busy={busy}
      scroll
      onRequestClose={onClose}
      footer={(
        <Inline gap="sm">
          <Button label="취소" variant="secondary" onPress={onClose} style={styles.grow} />
          <Button label="넣기" loading={busy} disabled={!selected.length} onPress={() => onConfirm(selected)} style={styles.grow} />
        </Inline>
      )}
    >
      <Stack gap="sm">
        <AppText variant="caption" color="textSecondary">
          {selected.length}장 선택 · 전체 {pageCount}페이지
        </AppText>
        <Inline gap="sm" wrap>
          <Button label="전체" size="sm" variant="secondary" onPress={() => setSelected(allPages(pageCount))} />
          <Button label="해제" size="sm" variant="secondary" onPress={() => setSelected([])} />
        </Inline>
        <View style={styles.chips}>
          {allPages(pageCount).map((page) => {
            const active = selected.includes(page);
            return (
              <Pressable
                key={page}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected((current) => togglePageSelection(current, page))}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText variant="caption" color={active ? 'onPrimary' : 'text'}>{page}</AppText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          accessibilityLabel="페이지 범위"
          label="페이지 범위"
          placeholder="예: 1-3, 5"
          value={range}
          onChangeText={setRange}
          helperText={error || '쉼표와 하이픈으로 범위를 입력한 뒤 적용하세요.'}
          error={error}
        />
        <Button label="범위 적용" variant="action" onPress={applyRange} />
      </Stack>
    </ModalShell>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    grow: { flex: 1, minWidth: 0 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    chip: {
      minWidth: 36,
      height: 36,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  });
}
