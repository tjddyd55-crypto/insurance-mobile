import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
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
} from '../../design-system';
import { buildTodoListParams, todoSourceLabel } from './todoModel';
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

  return (
    <View style={styles.root}>
      <AppHeader title="할 일" />
      <Screen padded={false}>
        <FlatList
          data={query.data ?? []}
          keyExtractor={(todo) => todo.id}
          contentContainerStyle={[
            styles.list,
            { padding: theme.spacing.lg, gap: theme.spacing.md },
            !query.data?.length && styles.emptyList,
          ]}
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
              <Inline justify="space-between" align="flex-start">
                <View style={styles.headingCopy}>
                  <AppText variant="heading">업무 목록</AppText>
                  <AppText variant="caption">플랫폼 공통 할 일을 관리합니다.</AppText>
                </View>
                <Button label="+ 추가" size="sm" onPress={() => router.push('/todos/new')} />
              </Inline>

              <Card variant="outlined">
                <Stack gap="md">
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
                            variant={source === item ? 'primary' : 'secondary'}
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
              <LoadingState message="할 일 목록을 불러오는 중…" />
            ) : query.isError ? (
              <ErrorState
                title="할 일 목록을 불러오지 못했습니다"
                message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <View style={styles.empty}>
                <AppText variant="heading">표시할 할 일이 없습니다</AppText>
                <AppText color="textSecondary" align="center">
                  필터를 바꾸거나 새 할 일을 추가해 주세요.
                </AppText>
              </View>
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
            variant={value === item.value ? 'primary' : 'secondary'}
            onPress={() => onChange(item.value)}
          />
        ))}
      </Inline>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flexGrow: 1 },
  emptyList: { justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 48 },
  headingCopy: { flex: 1, gap: 2 },
  filterEndPadding: { paddingRight: 8 },
});
