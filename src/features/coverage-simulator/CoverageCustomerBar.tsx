import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { ModalShell, TextField } from '../../design-system';
import { listCustomers } from '../customers/customersApi';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { simulatorTheme as theme } from './simulatorTheme';

export function CoverageCustomerBar() {
  const { token } = useAuth();
  const customer = useCoverageCustomer();
  const [open, setOpen] = useState(false);
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
  const linked = Boolean(customer.id && customer.name);

  return (
    <>
      <View style={styles.bar}>
        <Text style={styles.label}>고객</Text>
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.valueBtn}>
          <Text style={linked ? styles.value : styles.placeholder} numberOfLines={1}>
            {linked ? customer.name : '+ 고객 연결'}
          </Text>
          {linked ? <Text style={styles.chevron}>›</Text> : null}
        </Pressable>
        {linked ? (
          <Pressable accessibilityRole="button" accessibilityLabel="고객 연결 해제" onPress={() => customer.setCustomer({ id: null, name: null })} style={styles.clear}>
            <Text style={styles.clearLabel}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <ModalShell open={open} title="고객 선택" presentation="dialog" scroll onRequestClose={() => setOpen(false)}>
        <TextField accessibilityLabel="고객 검색" placeholder="이름" value={search} onChangeText={setSearch} />
        {query.isError ? <Text style={styles.error}>고객 목록을 불러오지 못했습니다.</Text> : null}
        {rows.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => {
              customer.setCustomer({ id: String(item.id), name: item.name });
              setOpen(false);
            }}
            style={styles.row}
          >
            <Text style={styles.rowName}>{item.name}</Text>
            {item.phone ? <Text style={styles.rowPhone}>{item.phone}</Text> : null}
          </Pressable>
        ))}
        {!query.isLoading && !rows.length ? <Text style={styles.empty}>표시할 고객이 없습니다.</Text> : null}
      </ModalShell>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 36,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: { fontSize: 11, fontWeight: '700', color: theme.muted },
  valueBtn: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: 13, fontWeight: '700', color: theme.text },
  placeholder: { fontSize: 13, fontWeight: '600', color: theme.primary },
  chevron: { color: '#94a3b8', fontSize: 16 },
  clear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  clearLabel: { color: '#94a3b8', fontSize: 16 },
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
