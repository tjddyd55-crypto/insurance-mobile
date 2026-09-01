import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  Inline,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { customerMatchesSearch, formatCustomerPhone } from '../customers/customerModel';
import { listCustomers } from '../customers/customersApi';
import { customerQueryKeys } from '../customers/queryKeys';
import {
  firstLineTodoTitle,
  isValidOptionalYmd,
  suggestTodoDueDate,
} from './todoModel';
import { createTodo, deleteTodo, listTodos, updateTodo } from './todosApi';
import { todoQueryKeys } from './queryKeys';
const ALL_TODOS_PARAMS = {};

type TodoFormState = {
  description: string;
  dueDate: string;
  relatedCustomerId: string;
  relatedCustomerName: string;
};

const EMPTY_FORM: TodoFormState = {
  description: '',
  dueDate: '',
  relatedCustomerId: '',
  relatedCustomerName: '',
};

export function TodoFormScreen({
  mode,
  todoId,
}: { mode: 'create'; todoId?: never } | { mode: 'edit'; todoId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [form, setForm] = useState<TodoFormState>({ ...EMPTY_FORM });
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(EMPTY_FORM));
  const [initialized, setInitialized] = useState(mode === 'create');
  const [formError, setFormError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const todosQuery = useQuery({
    queryKey: todoQueryKeys.list(ALL_TODOS_PARAMS),
    queryFn: () => listTodos(token),
    enabled: mode === 'edit' && Boolean(token),
  });
  const editingTodo = mode === 'edit'
    ? todosQuery.data?.find((todo) => todo.id === todoId) ?? null
    : null;
  const customersQuery = useQuery({
    queryKey: customerQueryKeys.all,
    queryFn: () => listCustomers(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (mode !== 'edit' || !editingTodo || initialized) return;
    const next: TodoFormState = {
      description: editingTodo.description.trim() || editingTodo.title,
      dueDate: editingTodo.dueDate ?? '',
      relatedCustomerId:
        editingTodo.relatedEntityType === 'customer' ? editingTodo.relatedEntityId ?? '' : '',
      relatedCustomerName: editingTodo.customerName ?? '',
    };
    setForm(next);
    setInitialSnapshot(JSON.stringify(next));
    setInitialized(true);
  }, [editingTodo, initialized, mode]);

  const customerResults = useMemo(() => {
    if (customerSearch.trim().length < 2) return [];
    return (customersQuery.data?.customers ?? [])
      .filter((customer) => customerMatchesSearch(customer, customerSearch))
      .slice(0, 10);
  }, [customerSearch, customersQuery.data?.customers]);
  const dirty = initialized && JSON.stringify(form) !== initialSnapshot;

  const saveMutation = useMutation({
    mutationFn: () => {
      const content = form.description.trim();
      const payload = {
        title: firstLineTodoTitle(content),
        description: content,
        dueDate: form.dueDate.trim() || null,
        dueTime: null,
        priority: 'normal' as const,
        relatedEntityType: form.relatedCustomerId ? ('customer' as const) : null,
        relatedEntityId: form.relatedCustomerId || null,
      };
      return mode === 'create'
        ? createTodo(token, { ...payload, sourceType: 'manual' })
        : updateTodo(token, todoId, payload);
    },
    onSuccess: async () => {
      setInitialSnapshot(JSON.stringify(form));
      await queryClient.invalidateQueries({ queryKey: todoQueryKeys.all });
      router.replace('/todos');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteTodo(token, todoId ?? ''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: todoQueryKeys.all });
      router.replace('/todos');
    },
  });

  const requestBack = () => {
    if (dirty && !saveMutation.isPending) {
      setDiscardOpen(true);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestBack();
      return true;
    });
    return () => subscription.remove();
  });

  const submit = () => {
    if (!form.description.trim()) {
      setFormError('내용을 입력해 주세요.');
      return;
    }
    if (!isValidOptionalYmd(form.dueDate.trim())) {
      setFormError('마감일은 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }
    setFormError('');
    saveMutation.mutate();
  };

  if (mode === 'edit' && todosQuery.isLoading) {
    return <LoadingState message="할 일을 불러오는 중…" />;
  }
  if (mode === 'edit' && (todosQuery.isError || (!editingTodo && todosQuery.isSuccess))) {
    return (
      <ErrorState
        title="할 일을 불러오지 못했습니다"
        message={todosQuery.error instanceof Error ? todosQuery.error.message : '할 일을 찾을 수 없습니다.'}
        onRetry={() => void todosQuery.refetch()}
      />
    );
  }

  const selectedCustomer = form.relatedCustomerId
    ? form.relatedCustomerName || `고객 #${form.relatedCustomerId}`
    : '';
  const busy = saveMutation.isPending || deleteMutation.isPending;
  const mutationError = saveMutation.error ?? deleteMutation.error;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader
        title={mode === 'create' ? '할 일 추가' : '할 일 수정'}
        showMenu={false}
        showBack
        onBackPress={requestBack}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="outlined">
          <Stack gap="lg">
            <TextField
              label="내용"
              required
              multiline
              autoFocus={mode === 'create'}
              value={form.description}
              onChangeText={(description) => {
                setForm((previous) => ({ ...previous, description: description.slice(0, 20_000) }));
                if (formError) setFormError('');
              }}
              placeholder="할 일을 입력하세요."
            />
            <Button
              label="본문에서 마감일 제안"
              size="sm"
              variant="ghost"
              onPress={() => {
                const suggested = suggestTodoDueDate(form.description);
                if (suggested && !form.dueDate) {
                  setForm((previous) => ({ ...previous, dueDate: suggested }));
                }
              }}
            />
            <TextField
              label="마감일"
              value={form.dueDate}
              onChangeText={(dueDate) => setForm((previous) => ({ ...previous, dueDate }))}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              helperText="오늘, 내일, 모레가 본문에 있으면 위 버튼으로 제안할 수 있습니다."
            />
          </Stack>
        </Card>

        <Card variant="outlined">
          <Stack gap="md">
            <AppText variant="heading">연결 고객</AppText>
            {selectedCustomer ? (
              <Inline justify="space-between">
                <View style={styles.customerName}>
                  <AppText variant="bodyStrong">{selectedCustomer}</AppText>
                  <AppText variant="caption">선택된 고객</AppText>
                </View>
                <Button
                  label="연결 해제"
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    setForm((previous) => ({
                      ...previous,
                      relatedCustomerId: '',
                      relatedCustomerName: '',
                    }))
                  }
                />
              </Inline>
            ) : (
              <AppText variant="caption">연결하지 않아도 저장할 수 있습니다.</AppText>
            )}
            <TextField
              label="고객 검색"
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="이름 또는 전화번호 2글자 이상"
              returnKeyType="search"
            />
            {customerSearch.trim().length >= 2 && customersQuery.isLoading ? (
              <AppText variant="caption">검색 중…</AppText>
            ) : null}
            {customerResults.map((customer) => (
              <Button
                key={customer.id}
                label={`${customer.name} · ${formatCustomerPhone(customer.phone) || '연락처 없음'}`}
                variant="secondary"
                size="sm"
                fullWidth
                onPress={() => {
                  setForm((previous) => ({
                    ...previous,
                    relatedCustomerId: String(customer.id),
                    relatedCustomerName: customer.name,
                  }));
                  setCustomerSearch('');
                }}
              />
            ))}
          </Stack>
        </Card>

        {formError ? <AppText color="danger">{formError}</AppText> : null}
        {mutationError ? (
          <AppText color="danger">
            {mutationError instanceof Error ? mutationError.message : '요청을 처리하지 못했습니다.'}
          </AppText>
        ) : null}
        {mode === 'edit' ? (
          <Button
            label="할 일 삭제"
            variant="danger"
            disabled={busy}
            onPress={() => setDeleteOpen(true)}
          />
        ) : null}
      </ScrollView>

      <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
        <View style={styles.footer}>
          <Button label="취소" variant="secondary" disabled={busy} onPress={requestBack} style={styles.grow} />
          <Button label="저장" loading={saveMutation.isPending} onPress={submit} style={styles.grow} />
        </View>
      </SafeAreaView>

      <ConfirmDialog
        open={discardOpen}
        title="변경사항 닫기"
        message="변경사항이 저장되지 않았습니다. 닫으시겠습니까?"
        confirmLabel="저장하지 않고 닫기"
        tone="danger"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          setInitialSnapshot(JSON.stringify(form));
          router.back();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="할 일 삭제"
        message="삭제 후에는 복구할 수 없습니다. 계속하시겠습니까?"
        confirmLabel="삭제"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    customerName: { flex: 1, gap: theme.spacing.xxs },
    footerSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    footer: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
    grow: { flex: 1 },
  });
}
