import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { ModalShell, TextField } from '../../design-system';
import { listCustomers } from '../customers/customersApi';
import {
  filterCoverageCustomerPickerRows,
  formatCoveragePickerMobileRow,
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
  const insets = useSafeAreaInsets();
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
      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      <TextField
        accessibilityLabel="고객 검색"
        placeholder="이름 · 생년월일 · 연락처"
        value={search}
        onChangeText={setSearch}
      />
      {query.isError ? <Text style={styles.error}>고객 목록을 불러오지 못했습니다.</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !query.isLoading ? <Text style={styles.empty}>표시할 고객이 없습니다.</Text> : null
        }
        renderItem={({ item }) => {
          const lines = formatCoveragePickerMobileRow(item);
          return (
            <Pressable
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
              <Text style={styles.nameLine}>{lines.primary}</Text>
              <Text style={styles.metaLine}>{lines.secondary}</Text>
            </Pressable>
          );
        }}
      />
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  close: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  listContent: { paddingBottom: 8 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    gap: 4,
  },
  nameLine: { fontSize: 15, fontWeight: '700', color: theme.text },
  metaLine: { fontSize: 14, color: theme.muted, lineHeight: 20, flexWrap: 'wrap' },
  empty: { textAlign: 'center', color: theme.muted, fontSize: 13, padding: 16 },
  error: { color: theme.danger, marginTop: 8 },
});
