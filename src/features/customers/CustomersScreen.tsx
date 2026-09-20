import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { SearchControlRow } from '../../components/SearchControlRow';
import {
  AppText,
  Button,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { CustomerListFilterModal } from './CustomerListFilterModal';
import {
  DEFAULT_CUSTOMER_LIST_FILTERS,
  buildCustomerListQueryOptions,
  countActiveCustomerListFilters,
  filterCustomerList,
  hasActiveCustomerListFilters,
  sortCustomerList,
  type CustomerListFilters,
} from './customerListFilters';
import { CustomerRegistrationSendModal } from './CustomerRegistrationSendModal';
import { listCustomers, setCustomerFavorite } from './customersApi';
import { CustomerListCard } from './CustomerListCard';
import {
  buildCustomerListCountText,
  buildCustomerListEmptyCopy,
} from './customerListPresentation';
import { CUSTOMER_LIST_STALE_MS, customerQueryKeys } from './queryKeys';
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
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<CustomerListFilters>(
    DEFAULT_CUSTOMER_LIST_FILTERS,
  );
  const [draftFilters, setDraftFilters] = useState<CustomerListFilters>(
    DEFAULT_CUSTOMER_LIST_FILTERS,
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [status, setStatus] = useState('');
  const [registrationSendOpen, setRegistrationSendOpen] = useState(false);

  useEffect(() => {
    if (filterOpen) {
      setDraftFilters(appliedFilters);
    }
  }, [appliedFilters, filterOpen]);
  const listQueryOptions = useMemo(
    () => buildCustomerListQueryOptions(appliedFilters),
    [appliedFilters],
  );
  const query = useQuery({
    queryKey: customerQueryKeys.list(listQueryOptions),
    queryFn: () => listCustomers(token, listQueryOptions),
    enabled: Boolean(token),
    staleTime: CUSTOMER_LIST_STALE_MS,
  });
  const favoriteMutation = useMutation({
    mutationFn: ({ customerId, isFavorite }: { customerId: number; isFavorite: boolean }) =>
      setCustomerFavorite(token, customerId, isFavorite),
    onSuccess: (updated) => {
      queryClient.setQueryData<ListCustomersResult>(
        customerQueryKeys.list(listQueryOptions),
        (previous) =>
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
    const rows = filterCustomerList(query.data?.customers ?? [], search, appliedFilters);
    return sortCustomerList(rows, appliedFilters);
  }, [appliedFilters, query.data?.customers, search]);
  const countText = buildCustomerListCountText({
    visibleCount: customers.length,
    totalCount: query.data?.total ?? customers.length,
    search,
    filtersActive: hasActiveCustomerListFilters(appliedFilters) || Boolean(search.trim()),
  });
  const emptyCopy = buildCustomerListEmptyCopy(
    search,
    hasActiveCustomerListFilters(appliedFilters),
  );
  const filtersActive = hasActiveCustomerListFilters(appliedFilters);
  const activeFilterCount = countActiveCustomerListFilters(appliedFilters);

  const applySearch = () => {
    setSearch(searchDraft.trim());
  };

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
                  onPress={() => setRegistrationSendOpen(true)}
                  style={styles.topActionButton}
                />
              </Inline>
              <SearchControlRow
                placeholder="이름 / 전화번호 검색"
                value={searchDraft}
                onChangeText={setSearchDraft}
                onSubmit={applySearch}
                accessibilityLabel="고객 검색"
                trailing={
                  <Button
                    label={activeFilterCount ? `필터 · ${activeFilterCount}` : '필터'}
                    size="md"
                    variant={filtersActive ? 'secondary' : 'ghost'}
                    onPress={() => setFilterOpen(true)}
                    accessibilityState={{ selected: filtersActive }}
                    testID="customers-filter-button"
                    style={styles.filterButton}
                  />
                }
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

      <CustomerRegistrationSendModal
        open={registrationSendOpen}
        token={token}
        onClose={() => setRegistrationSendOpen(false)}
        onFeedback={setStatus}
      />

      <CustomerListFilterModal
        open={filterOpen}
        draft={draftFilters}
        onChange={setDraftFilters}
        onClose={() => {
          setFilterOpen(false);
          setFilterError('');
        }}
        onReset={() => {
          setDraftFilters(DEFAULT_CUSTOMER_LIST_FILTERS);
          setFilterError('');
        }}
        onApply={() => {
          if (
            draftFilters.consultationFilter === 'no_since' &&
            !draftFilters.consultationCutoff.trim()
          ) {
            setFilterError('기준 날짜를 선택해 주세요.');
            return;
          }
          setFilterError('');
          setAppliedFilters(draftFilters);
          setFilterOpen(false);
        }}
        errorMessage={filterError}
      />
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
    topActionButton: { flex: 1, minWidth: 0 },
    filterButton: { minWidth: 72, alignSelf: 'stretch' },
    grow: { flex: 1 },
  });
}
