import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import { CustomerPickerDialog } from './CustomerPickerDialog';
import { formatCoverageEditorCustomerLine } from './coverageEditorPresentation';
import { useCoverageCustomer } from './CoverageCustomerContext';

type Props = {
  notice: string;
  onDismissMenu?: () => void;
};

/** 편집 화면 상단 — 고객 선택/표시 한 줄만 (저장은 AppHeader) */
export function CoverageAnalysisSaveSection({ notice, onDismissMenu }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const customer = useCoverageCustomer();
  const [open, setOpen] = useState(false);
  const linkedLine = formatCoverageEditorCustomerLine(customer);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={linkedLine ? '고객 변경' : '고객 선택'}
        onPress={() => {
          onDismissMenu?.();
          setOpen(true);
        }}
        style={styles.chip}
      >
        <AppText
          variant="bodyStrong"
          numberOfLines={1}
          color={linkedLine ? 'text' : 'primary'}
        >
          {linkedLine ?? '+ 고객 선택'}
        </AppText>
      </Pressable>
      <CustomerPickerDialog open={open} onClose={() => setOpen(false)} />
      {notice ? <AppText color="danger">{notice}</AppText> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xs },
    chip: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSubtle,
      justifyContent: 'center',
    },
  });
}
