import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
} from '../../design-system';
import { customerMatchesSearch } from './customerModel';
import { listCustomers, setCustomerFavorite } from './customersApi';
import { CustomerListCard } from './CustomerListCard';
import { customerQueryKeys } from './queryKeys';
import type { CustomerRecord, ListCustomersResult } from './types';

export function CustomersScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const query = useQuery({
    queryKey: customerQueryKeys.all,
    queryFn: () => listCustomers(token),
    enabled: Boolean(token),
  });
  const favoriteMutation = useMutation({
    mutationFn: ({ customerId, isFavorite }: { customerId: number; isFavorite: boolean }) =>
      setCustomerFavorite(token, customerId, isFavorite),
    onSuccess: (updated) => {
      queryClient.setQueryData<ListCustomersResult>(customerQueryKeys.all, (previous) =>
        previous
          ? {
              ...previous,
              customers: previous.customers.map((customer) =>
                customer.id === updated.id ? updated : customer,
              ),
            }
          : previous,
      );
    },
  });

  const customers = useMemo(() => {
    const rows = (query.data?.customers ?? [])
      .filter((customer) => customerMatchesSearch(customer, search))
      .filter((customer) => !favoritesOnly || customer.isFavorite);
    return [...rows].sort((a, b) => {
      const favoriteDiff = Number(b.isFavorite) - Number(a.isFavorite);
      if (favoriteDiff) return favoriteDiff;
      return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
    });
  }, [favoritesOnly, query.data?.customers, search]);

  return (
    <View style={styles.root}>
      <AppHeader title="고객리스트" />
      <Screen padded={false}>
        <FlatList
          data={customers}
          keyExtractor={(customer) => String(customer.id)}
          contentContainerStyle={[
            styles.list,
            { padding: theme.spacing.lg, gap: theme.spacing.md },
            customers.length === 0 && styles.emptyList,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Stack gap="md" style={{ marginBottom: theme.spacing.md }}>
              <TextField
                accessibilityLabel="고객 검색"
                placeholder="이름, 연락처, 고객번호 검색"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCorrect={false}
              />
              <Inline justify="space-between">
                <AppText variant="caption">
                  {search || favoritesOnly
                    ? `${customers.length}명 검색됨`
                    : `전체 ${query.data?.total ?? customers.length}명`}
                </AppText>
                <Inline>
                  <Button
                    label={favoritesOnly ? '전체 보기' : '중요 고객만'}
                    size="sm"
                    variant={favoritesOnly ? 'primary' : 'secondary'}
                    onPress={() => setFavoritesOnly((value) => !value)}
                  />
                  <Button
                    label="고객 등록"
                    size="sm"
                    onPress={() => router.push('/customers/new')}
                  />
                </Inline>
              </Inline>
              {favoriteMutation.isError ? (
                <AppText variant="caption" color="danger">
                  즐겨찾기를 변경하지 못했습니다. 다시 시도해 주세요.
                </AppText>
              ) : null}
            </Stack>
          }
          renderItem={({ item }: { item: CustomerRecord }) => (
            <CustomerListCard
              customer={item}
              favoriteBusy={
                favoriteMutation.isPending && favoriteMutation.variables?.customerId === item.id
              }
              onToggleFavorite={(customer) =>
                favoriteMutation.mutate({
                  customerId: customer.id,
                  isFavorite: !customer.isFavorite,
                })
              }
            />
          )}
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingState message="고객 목록을 불러오는 중…" />
            ) : query.isError ? (
              <ErrorState
                title="고객 목록을 불러오지 못했습니다"
                message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <View style={styles.empty}>
                <AppText variant="heading">고객이 없습니다</AppText>
                <AppText variant="body" color="textSecondary" align="center">
                  검색 조건을 바꾸거나 새 고객을 등록해 주세요.
                </AppText>
              </View>
            )
          }
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flexGrow: 1 },
  emptyList: { justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 48 },
});
