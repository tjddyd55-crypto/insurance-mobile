import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { ModalShell, TextField } from '../../design-system';
import { listCustomers } from '../customers/customersApi';
import {
  filterCoverageCustomerPickerRows,
  toCoverageCustomerPickerRow,
} from './coverageCustomerPickerPresentation';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { simulatorTheme as theme } from './simulatorTheme';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CustomerPickerDialog({ open, onClose }: Props) {
  const { token } = useAuth();
  const customer = useCoverageCustomer();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['coverage-simulator', 'customers'],
    queryFn: () => listCustomers(token, { limit: 200 }),
    enabled: open && Boolean(token),
  });
  const rows = useMemo(() => {
    const mapped = (query.data?.customers ?? []).map(toCoverageCustomerPickerRow);
    return filterCoverageCustomerPickerRows(mapped, search);
  }, [query.data, search]);

  return (
    <ModalShell
      open={open}
      title="고객 선택"
      presentation="dialog"
      scroll
      keyboardAvoiding
      closeOnBackdrop={false}
      onRequestClose={onClose}
      headerAction={<Text accessibilityRole="button" onPress={onClose} style={styles.close}>닫기</Text>}
    >
      <TextField
        accessibilityLabel="고객 검색"
        placeholder="이름 · 생년월일 · 연락처"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.nameCol]}>이름</Text>
        <Text style={[styles.headerCell, styles.birthCol]}>생년월일</Text>
        <Text style={[styles.headerCell, styles.phoneCol]}>연락처</Text>
      </View>
      {query.isError ? <Text style={styles.error}>고객 목록을 불러오지 못했습니다.</Text> : null}
      {rows.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => {
            customer.setCustomer({
              id: item.id,
              name: item.name === '—' ? '' : item.name,
              birthDate: item.birthDate,
              phone: item.phone,
            });
            onClose();
          }}
          style={styles.row}
        >
          <Text style={[styles.rowText, styles.nameCol]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.rowText, styles.birthCol]} numberOfLines={1}>{item.birthDate}</Text>
          <Text style={[styles.rowText, styles.phoneCol]} numberOfLines={1}>{item.phone}</Text>
        </Pressable>
      ))}
      {!query.isLoading && !rows.length ? <Text style={styles.empty}>표시할 고객이 없습니다.</Text> : null}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  close: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  headerCell: { fontSize: 12, fontWeight: '700', color: theme.muted },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    alignItems: 'center',
  },
  rowText: { fontSize: 14, color: theme.text },
  nameCol: { flex: 1.1, minWidth: 0, fontWeight: '600' },
  birthCol: { flex: 1, minWidth: 0 },
  phoneCol: { flex: 1.1, minWidth: 0, textAlign: 'right' },
  empty: { textAlign: 'center', color: theme.muted, fontSize: 13, padding: 16 },
  error: { color: theme.danger, marginTop: 8 },
});
