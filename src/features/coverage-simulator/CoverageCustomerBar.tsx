import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
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
import { listCustomers } from '../customers/customersApi';
import { useCoverageCustomer } from './CoverageCustomerContext';

export function CoverageCustomerBar() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const customer = useCoverageCustomer();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['coverage-simulator', 'customers'],
    queryFn: () => listCustomers(token, { limit: 100 }),
    enabled: open && Boolean(token),
  });
  const rows = (query.data?.customers ?? [])
    .filter((item) => item.name.includes(search.trim()))
    .slice(0, 30);

  return (
    <View style={styles.bar}>
      <Stack gap="xs" style={styles.copy}>
        <AppText variant="caption" color="textMuted">고객</AppText>
        <AppText numberOfLines={1}>{customer.name || '고객 없음'}</AppText>
      </Stack>
      <Inline gap="sm">
        <Button label="고객 선택" size="sm" variant="secondary" onPress={() => setOpen(true)} />
        {customer.id ? <Button label="해제" size="sm" variant="ghost" onPress={() => customer.setCustomer({ id: null, name: null })} /> : null}
      </Inline>
      <ModalShell open={open} title="고객 선택" presentation="dialog" scroll onRequestClose={() => setOpen(false)}>
        <Stack gap="sm">
          <TextField accessibilityLabel="고객 검색" placeholder="이름" value={search} onChangeText={setSearch} />
          {query.isError ? <AppText color="danger">고객 목록을 불러오지 못했습니다.</AppText> : null}
          {rows.map((item) => (
            <Button
              key={item.id}
              label={item.name}
              variant="secondary"
              onPress={() => {
                customer.setCustomer({ id: String(item.id), name: item.name });
                setOpen(false);
              }}
            />
          ))}
          {!query.isLoading && !rows.length ? <AppText color="textSecondary">표시할 고객이 없습니다.</AppText> : null}
        </Stack>
      </ModalShell>
    </View>
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
