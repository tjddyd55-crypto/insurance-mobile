import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { ModalShell, TextField } from '../../design-system';
import { listCustomers } from '../customers/customersApi';
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
    queryFn: () => listCustomers(token, { limit: 100 }),
    enabled: open && Boolean(token),
  });
  const rows = useMemo(
    () => (query.data?.customers ?? []).filter((item) => item.name.includes(search.trim())).slice(0, 30),
    [query.data, search],
  );

  return (
    <ModalShell open={open} title="고객 선택" presentation="dialog" scroll onRequestClose={onClose}>
      <TextField accessibilityLabel="고객 검색" placeholder="이름" value={search} onChangeText={setSearch} />
      {query.isError ? <Text style={styles.error}>고객 목록을 불러오지 못했습니다.</Text> : null}
      {rows.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => {
            customer.setCustomer({ id: String(item.id), name: item.name });
            onClose();
          }}
          style={styles.row}
        >
          <Text style={styles.rowName}>{item.name}</Text>
          {item.phone ? <Text style={styles.rowPhone}>{item.phone}</Text> : null}
        </Pressable>
      ))}
      {!query.isLoading && !rows.length ? <Text style={styles.empty}>표시할 고객이 없습니다.</Text> : null}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: { fontWeight: '700', color: theme.text },
  rowPhone: { fontSize: 13, color: theme.muted },
  empty: { textAlign: 'center', color: theme.muted, fontSize: 13, padding: 16 },
  error: { color: theme.danger, marginTop: 8 },
});
