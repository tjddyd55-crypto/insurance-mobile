import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Button, Inline, Screen, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { getCustomer } from '../customers/customersApi';
import { customerQueryKeys } from '../customers/queryKeys';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';
import { markScheduleTodoStatus, refreshScheduleSurfaces } from '../home-widgets/refreshScheduleSurfaces';
import {
  CUSTOMER_ADD_TODO_LABEL,
  customerTodoCreateRoute,
  customerTodoEditRoute,
  customerTodosListParams,
  onlyCustomerTodos,
  sortCustomerTodos,
} from './customerTodos';
import { todoQueryKeys } from './queryKeys';
import { TodoCard } from './TodoCard';
import { completeTodo, listTodos, reopenTodo } from './todosApi';
import type { TodoRecord } from './types';

/** 고객 상세 > 할 일. 이 고객에 연결된 할 일만, 미완료 먼저·완료도 표시. */
export function CustomerTodosScreen({ customerId }: { customerId: number }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const onBackPress = useCustomerDetailBack(customerId);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const validId = Number.isInteger(customerId) && customerId > 0;
  const params = useMemo(() => customerTodosListParams(customerId), [customerId]);

  const customerQuery = useQuery({
    queryKey: customerQueryKeys.workspace(customerId),
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token) && validId,
  });
  const todosQuery = useQuery({
    queryKey: todoQueryKeys.list(params),
    queryFn: () => listTodos(token, params),
    enabled: Boolean(token) && validId,
  });
  const todos = useMemo(
    () => sortCustomerTodos(onlyCustomerTodos(todosQuery.data ?? [], customerId)),
    [customerId, todosQuery.data],
  );
  const stateMutation = useMutation({
    mutationFn: async (todo: TodoRecord) => {
      if (todo.status === 'completed') await reopenTodo(token, todo.id);
      else await completeTodo(token, todo.id);
      markScheduleTodoStatus(queryClient, todo.id, todo.status === 'completed' ? 'open' : 'completed');
      await refreshScheduleSurfaces(queryClient, token && user ? { token, user } : null);
    },
  });
  const customerName = customerQuery.data?.name ?? '';

  return (
    <View style={styles.root}>
      <AppHeader title={`${customerName || '고객'} 할 일`} showMenu={false} showBack onBackPress={onBackPress} />
      <Screen padded={false}>
        <FlatList
          data={todos}
          keyExtractor={(todo) => todo.id}
          contentContainerStyle={[styles.list, !todos.length && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={todosQuery.isRefetching}
              onRefresh={() => void todosQuery.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Stack gap="sm" style={styles.header}>
              <Inline justify="space-between" align="flex-start">
                <View style={styles.grow}>
                  <AppText variant="title">고객 할 일</AppText>
                  <AppText variant="caption">{customerName || `고객 #${customerId}`}</AppText>
                </View>
                <Button
                  label={CUSTOMER_ADD_TODO_LABEL}
                  size="sm"
                  disabled={!validId}
                  onPress={() => router.push(customerTodoCreateRoute({ customerId, customerName }) as Href)}
                />
              </Inline>
              {stateMutation.isError ? (
                <AppText variant="caption" color="danger">
                  {stateMutation.error instanceof Error ? stateMutation.error.message : '할 일 상태를 변경하지 못했습니다.'}
                </AppText>
              ) : null}
            </Stack>
          }
          renderItem={({ item }) => (
            <TodoCard
              todo={item}
              dateOnly
              editHref={customerTodoEditRoute(item.id, customerId) as Href}
              stateBusy={stateMutation.isPending && stateMutation.variables?.id === item.id}
              onToggleDone={(todo) => stateMutation.mutate(todo)}
            />
          )}
          ListEmptyComponent={
            todosQuery.isLoading ? (
              <LoadingState compact message="할 일을 불러오는 중…" />
            ) : todosQuery.isError ? (
              <ErrorState
                compact
                title="할 일을 불러오지 못했습니다"
                message={todosQuery.error instanceof Error ? todosQuery.error.message : '잠시 후 다시 시도해 주세요.'}
                onRetry={() => void todosQuery.refetch()}
              />
            ) : (
              <EmptyState compact title="이 고객의 할 일이 없습니다" message={`${CUSTOMER_ADD_TODO_LABEL}로 등록할 수 있습니다.`} />
            )
          }
        />
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    list: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    emptyList: { flexGrow: 1 },
    header: { marginBottom: theme.spacing.sm },
    grow: { flex: 1 },
  });
}
