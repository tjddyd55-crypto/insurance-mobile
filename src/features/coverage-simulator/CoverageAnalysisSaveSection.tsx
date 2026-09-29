import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Inline,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { CustomerPickerDialog } from './CustomerPickerDialog';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { formatConsultationListDate } from './coverageAnalysis';

type Props = {
  consultationDate: string;
  notice: string;
  onSave: () => void;
};

/** 분석 화면에서 제품이 확정한 상단. `이 고객으로 저장`까지만 담당한다. */
export function CoverageAnalysisSaveSection({ consultationDate, notice, onSave }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const customer = useCoverageCustomer();
  const [open, setOpen] = useState(false);

  return (
    <Stack gap="md">
      <View style={styles.bar}>
        <Stack gap="xs" style={styles.copy}>
          <AppText variant="caption" color="textMuted">고객</AppText>
          <AppText numberOfLines={1}>{customer.name || '고객 없음'}</AppText>
        </Stack>
        <Inline gap="sm">
          <Button label="고객 선택" size="sm" variant="secondary" onPress={() => setOpen(true)} />
          {customer.id ? (
            <Button label="해제" size="sm" variant="ghost" onPress={() => customer.setCustomer({ id: null, name: null })} />
          ) : null}
        </Inline>
      </View>
      <CustomerPickerDialog open={open} onClose={() => setOpen(false)} />
      <Inline justify="space-between">
        <AppText variant="caption" color="textMuted">상담일 {formatConsultationListDate(consultationDate)}</AppText>
        <Button label="이 고객으로 저장" size="sm" variant="action" onPress={onSave} />
      </Inline>
      {notice ? <AppText color="danger">{notice}</AppText> : null}
    </Stack>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    copy: { flex: 1, minWidth: 0 },
  });
}
