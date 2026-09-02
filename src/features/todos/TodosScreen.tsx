import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { buildTodoListParams, todoSourceLabel } from './todoModel';
import { todoListEmptyCopy } from './todoPresentation';
import { completeTodo, listTodos, reopenTodo } from './todosApi';
import { TodoCard } from './TodoCard';
import { todoQueryKeys } from './queryKeys';
import type {
  TodoQuickFilter,
  TodoRecord,
  TodoRelatedFilter,
  TodoSourceType,
} from './types';

const QUICK_FILTERS: { value: TodoQuickFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'today', label: '오늘' },
  { value: 'tomorrow', label: '내일' },
  { value: 'week', label: '주' },
  { value: 'open', label: '미완료' },
  { value: 'completed', label: '완료' },
  { value: 'overdue', label: '지남' },
];

const RELATED_FILTERS: { value: TodoRelatedFilter; label: string }[] = [
  { value: 'any', label: '연결전체' },
  { value: 'yes', label: '연결있음' },
  { value: 'no', label: '연결없음' },
];

const SOURCE_FILTERS: (TodoSourceType | 'all')[] = [
  'all',
  'manual',
  'customer_memo',
  'consultation_note',
  'pdf_document',
  'e_document',
  'system',
];

export function TodosScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [quick, setQuick] = useState<TodoQuickFilter>('open');
  const [related, setRelated] = useState<TodoRelatedFilter>('any');
  const [source, setSource] = useState<TodoSourceType | 'all'>('all');
  const params = useMemo(() => buildTodoListParams(quick, related, source), [quick, related, source]);
  const query = useQuery({
    queryKey: todoQueryKeys.list(params),
    queryFn: () => listTodos(token, params),
    enabled: Boolean(token),
  });
  const stateMutation = useMutation({
    mutationFn: (todo: TodoRecord) =>
      todo.status === 'completed' ? reopenTodo(token, todo.id) : completeTodo(token, todo.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoQueryKeys.all }),
  });
  const emptyCopy = todoListEmptyCopy(quick !== 'open' || related !== 'any' || source !== 'all');

  return (
    <View style={styles.root}>
      <AppHeader title="할 일" />
      <Screen padded={false}>
        <FlatList
          data={query.data ?? []}
          keyExtractor={(todo) => todo.id}
          contentContainerStyle={[styles.list, !query.data?.length && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Stack gap="sm" style={styles.header}>
              <Inline justify="space-between" align="flex-start">
                <AppText variant="caption" color="textSecondary" style={styles.headingCopy}>
                  플랫폼 공통 업무 목록
                </AppText>
                <Button label="+ 추가" size="sm" onPress={() => router.push('/todos/new')} />
              </Inline>

              <Card variant="outlined" padding="sm">
                <Stack gap="sm">
                  <FilterRow
                    accessibilityLabel="날짜 및 상태 필터"
                    items={QUICK_FILTERS}
                    value={quick}
                    onChange={setQuick}
                  />
                  <FilterRow
                    accessibilityLabel="연결 대상 필터"
                    items={RELATED_FILTERS}
                    value={related}
                    onChange={setRelated}
                  />
                  <Stack gap="xs">
                    <AppText variant="label">출처</AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Inline style={styles.filterEndPadding}>
                        {SOURCE_FILTERS.map((item) => (
                          <Button
                            key={item}
                            label={item === 'all' ? '전체' : todoSourceLabel(item)}
                            size="sm"
                            variant={source === item ? 'selected' : 'secondary'}
                            onPress={() => setSource(item)}
                          />
                        ))}
                      </Inline>
                    </ScrollView>
                  </Stack>
                </Stack>
              </Card>

              {stateMutation.isError ? (
                <AppText variant="caption" color="danger">
                  {stateMutation.error instanceof Error
                    ? stateMutation.error.message
                    : '할 일 상태를 변경하지 못했습니다.'}
                </AppText>
              ) : null}
            </Stack>
          }
          renderItem={({ item }) => (
            <TodoCard
              todo={item}
              stateBusy={stateMutation.isPending && stateMutation.variables?.id === item.id}
              onToggleDone={(todo) => stateMutation.mutate(todo)}
            />
          )}
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingState compact message="할 일 목록을 불러오는 중…" />
            ) : query.isError ? (
              <ErrorState
                compact
                title="할 일 목록을 불러오지 못했습니다"
                message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <EmptyState compact title={emptyCopy.title} message={emptyCopy.message} />
            )
          }
        />
      </Screen>
    </View>
  );
}

function FilterRow<T extends string>({
  accessibilityLabel,
  items,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useMemo(
    () => StyleSheet.create({ filterEndPadding: { paddingRight: 8 } }),
    [],
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
    >
      <Inline style={styles.filterEndPadding}>
        {items.map((item) => (
          <Button
            key={item.value}
            label={item.label}
            size="sm"
            variant={value === item.value ? 'selected' : 'secondary'}
            onPress={() => onChange(item.value)}
          />
        ))}
      </Inline>
    </ScrollView>
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
    emptyList: { flexGrow: 1 },
    header: { marginBottom: theme.spacing.xs },
    headingCopy: { flex: 1, minWidth: 0 },
    filterEndPadding: { paddingRight: 8 },
  });
}
