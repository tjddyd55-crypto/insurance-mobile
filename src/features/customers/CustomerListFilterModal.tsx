import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { DateField } from '../../components/DateField';
import { ModalCloseButton } from '../../components/ModalCloseButton';
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
  CUSTOMER_CONSULTATION_FILTER_OPTIONS,
  CUSTOMER_GENDER_FILTER_OPTIONS,
  CUSTOMER_INFLOW_SOURCE_FILTER_OPTIONS,
  CUSTOMER_LIST_SORT_OPTIONS,
  CUSTOMER_QUICK_SORT_OPTIONS,
} from './customerListFilterConfig';
import {
  DEFAULT_CUSTOMER_LIST_FILTERS,
  type CustomerListFilters,
} from './customerListFilters';

type CustomerListFilterModalProps = {
  open: boolean;
  draft: CustomerListFilters;
  onChange: (next: CustomerListFilters) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  errorMessage?: string;
};

export function CustomerListFilterModal({
  open,
  draft,
  onChange,
  onClose,
  onReset,
  onApply,
  errorMessage,
}: CustomerListFilterModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ModalShell
      open={open}
      title="필터 · 정렬"
      onRequestClose={onClose}
      headerAction={<ModalCloseButton onPress={onClose} />}
      footer={
        <Inline>
          <Button label="초기화" variant="secondary" onPress={onReset} style={styles.grow} />
          <Button label="적용" variant="action" onPress={onApply} style={styles.grow} />
        </Inline>
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack gap="lg">
          <Stack gap="sm">
            <AppText variant="heading">정렬</AppText>
            {CUSTOMER_LIST_SORT_OPTIONS.map((option) => (
              <Button
                key={option.value || 'default'}
                label={option.label}
                variant={draft.listSort === option.value ? 'selected' : 'ghost'}
                onPress={() => onChange({ ...draft, listSort: option.value, quickSort: null })}
              />
            ))}
          </Stack>

          <Stack gap="sm">
            <AppText variant="heading">빠른 정렬</AppText>
            {CUSTOMER_QUICK_SORT_OPTIONS.map((option) => (
              <Button
                key={option.label}
                label={option.label}
                variant={draft.quickSort === option.value ? 'selected' : 'ghost'}
                onPress={() =>
                  onChange({
                    ...draft,
                    quickSort: option.value,
                    listSort: option.value ? '' : draft.listSort,
                  })
                }
              />
            ))}
          </Stack>

          <Stack gap="sm">
            <AppText variant="heading">필터</AppText>
            <Button
              label={draft.favoritesOnly ? '중요 고객만 · 켜짐' : '중요 고객만'}
              variant={draft.favoritesOnly ? 'selected' : 'ghost'}
              onPress={() =>
                onChange({ ...draft, favoritesOnly: !draft.favoritesOnly })
              }
            />

            <AppText variant="label" color="textSecondary">성별</AppText>
            <Inline wrap gap="xs">
              {CUSTOMER_GENDER_FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  label={option.label}
                  size="sm"
                  variant={draft.gender === option.value ? 'selected' : 'secondary'}
                  onPress={() => onChange({ ...draft, gender: option.value })}
                />
              ))}
            </Inline>

            <Inline gap="sm">
              <TextField
                label="보험나이 최소"
                value={draft.minInsuranceAge}
                onChangeText={(value) => onChange({ ...draft, minInsuranceAge: value })}
                keyboardType="number-pad"
                containerStyle={styles.grow}
              />
              <TextField
                label="보험나이 최대"
                value={draft.maxInsuranceAge}
                onChangeText={(value) => onChange({ ...draft, maxInsuranceAge: value })}
                keyboardType="number-pad"
                containerStyle={styles.grow}
              />
            </Inline>

            <AppText variant="label" color="textSecondary">유입 경로</AppText>
            <Inline wrap gap="xs">
              {CUSTOMER_INFLOW_SOURCE_FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  label={option.label}
                  size="sm"
                  variant={draft.inflowSource === option.value ? 'selected' : 'secondary'}
                  onPress={() => onChange({ ...draft, inflowSource: option.value })}
                />
              ))}
            </Inline>

            <AppText variant="label" color="textSecondary">상담 여부</AppText>
            {CUSTOMER_CONSULTATION_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value || 'all'}
                label={option.label}
                variant={draft.consultationFilter === option.value ? 'selected' : 'ghost'}
                onPress={() =>
                  onChange({
                    ...draft,
                    consultationFilter: option.value,
                    consultationCutoff:
                      option.value === 'no_since' ? draft.consultationCutoff : '',
                  })
                }
              />
            ))}
            {draft.consultationFilter === 'no_since' ? (
              <DateField
                label="기준 날짜"
                value={draft.consultationCutoff}
                onChange={(value) => onChange({ ...draft, consultationCutoff: value })}
                required
              />
            ) : null}
          </Stack>

          {errorMessage ? <AppText color="danger">{errorMessage}</AppText> : null}
        </Stack>
      </ScrollView>
    </ModalShell>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingBottom: theme.spacing.lg,
    },
    grow: { flex: 1 },
  });
}

export { DEFAULT_CUSTOMER_LIST_FILTERS };
