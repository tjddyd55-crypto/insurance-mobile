import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Inline,
  ModalShell,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { customerMatchesSearch } from './customerModel';
import { getCustomerRegistrationLink, listCustomers, setCustomerFavorite } from './customersApi';
import { CustomerListCard } from './CustomerListCard';
import {
  buildCustomerListCountText,
  buildCustomerListEmptyCopy,
} from './customerListPresentation';
import { customerQueryKeys } from './queryKeys';
import type { CustomerRecord, ListCustomersResult } from './types';

/**
 * Root cause (필터 버튼 소실):
 * 7808d36 정렬 커밋에서 좌측 상단 액션이 사라지고
 * 「중요 고객」만 검색창 옆으로 이동했다.
 * WIP로 「고객 등록 발송」만 추가되어 상단이 2개만 보였고,
 * 「필터」는 overflow/숨김이 아니라 애초에 복구되지 않은 상태였다.
 */
export function CustomersScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [status, setStatus] = useState('');
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
  const inviteMutation = useMutation({
    mutationFn: () => getCustomerRegistrationLink(token),
    onSuccess: async (url) => {
      await Clipboard.setStringAsync(url);
      setStatus('고객등록 링크를 복사했습니다.');
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : '고객등록 링크를 만들 수 없습니다.');
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
  const countText = buildCustomerListCountText({
    visibleCount: customers.length,
    totalCount: query.data?.total ?? customers.length,
    search,
    favoritesOnly,
  });
  const emptyCopy = buildCustomerListEmptyCopy(search, favoritesOnly);

  return (
    <View style={styles.root}>
      <AppHeader title="고객리스트" />
      <Screen padded={false}>
        <FlatList
          data={customers}
          keyExtractor={(customer) => String(customer.id)}
          contentContainerStyle={[
            styles.list,
            customers.length === 0 && styles.emptyList,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Stack gap="md" style={styles.listHeader}>
              <Inline wrap gap="xs" style={styles.topActions} testID="customers-top-actions">
                <Button
                  label="고객 등록"
                  size="sm"
                  variant="action"
                  onPress={() => router.push('/customers/new')}
                  style={styles.topActionButton}
                />
                <Button
                  label="고객 등록 발송"
                  size="sm"
                  variant="action"
                  loading={inviteMutation.isPending}
                  onPress={() => inviteMutation.mutate()}
                  style={styles.topActionButton}
                />
                <Button
                  label="필터"
                  size="sm"
                  variant={favoritesOnly ? 'secondary' : 'ghost'}
                  onPress={() => setFilterOpen(true)}
                  style={styles.topActionButton}
                  accessibilityState={{ selected: favoritesOnly }}
                />
              </Inline>
              <TextField
                accessibilityLabel="고객 검색"
                placeholder="이름 / 전화번호 검색"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCorrect={false}
              />
              {query.isSuccess && (query.data?.customers.length ?? 0) > 0 ? (
                <AppText variant="helper" color="textSecondary">
                  {countText}
                </AppText>
              ) : null}
              {status ? (
                <AppText variant="caption" color="success">
                  {status}
                </AppText>
              ) : null}
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
              <EmptyState title={emptyCopy.title} message={emptyCopy.message} />
            )
          }
        />
      </Screen>

      <ModalShell
        open={filterOpen}
        title="필터"
        onRequestClose={() => setFilterOpen(false)}
        headerAction={
          <Button label="닫기" size="sm" variant="ghost" onPress={() => setFilterOpen(false)} />
        }
        footer={
          <Inline>
            <Button
              label="초기화"
              variant="secondary"
              onPress={() => setFavoritesOnly(false)}
              style={styles.grow}
            />
            <Button
              label="적용"
              variant="action"
              onPress={() => setFilterOpen(false)}
              style={styles.grow}
            />
          </Inline>
        }
      >
        <Stack gap="md">
          <AppText variant="helper" color="textSecondary">
            기존 중요 고객 필터를 그대로 사용합니다.
          </AppText>
          <Button
            label={favoritesOnly ? '중요 고객만 보기 · 켜짐' : '중요 고객만 보기'}
            variant={favoritesOnly ? 'secondary' : 'ghost'}
            onPress={() => setFavoritesOnly((value) => !value)}
          />
        </Stack>
      </ModalShell>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    list: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
      gap: theme.layout.compactListGap,
    },
    emptyList: { minHeight: '100%' },
    listHeader: { marginBottom: theme.spacing.xs },
    topActions: { width: '100%' },
    topActionButton: { flexGrow: 1, flexBasis: '30%', minWidth: 96 },
    grow: { flex: 1 },
  });
}
