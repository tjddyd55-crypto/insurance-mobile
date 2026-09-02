import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import {
  AppText,
  Button,
  Card,
  Inline,
  ModalShell,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { getCustomer, updateCustomer } from '../customers/customersApi';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';
import type { CustomerNote } from '../customers/types';
import { newCustomerNoteId } from './customerWorkspaceModel';

type MemoEditorState = {
  open: boolean;
  note: CustomerNote | null;
};

const CLOSED_EDITOR: MemoEditorState = { open: false, note: null };

export function CustomerMemosScreen({ customerId }: { customerId: number }) {
  const { token } = useAuth();
  const onBackPress = useCustomerDetailBack(customerId);
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [draft, setDraft] = useState('');
  const [editor, setEditor] = useState<MemoEditorState>(CLOSED_EDITOR);
  const [deleting, setDeleting] = useState<CustomerNote | null>(null);
  const queryKey = ['customer', customerId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token && customerId),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!query.data) return;
      const items = editor.note
        ? query.data.notes.items.map((item) =>
            item.id === editor.note?.id ? { ...item, content: draft.trim() } : item,
          )
        : [
            {
              id: newCustomerNoteId(),
              content: draft.trim(),
              createdAt: new Date().toISOString(),
            },
            ...query.data.notes.items,
          ];
      await updateCustomer(token, customerId, {
        notes: { ...query.data.notes, items },
      });
    },
    onSuccess: async () => {
      closeEditor();
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const remove = useMutation({
    mutationFn: async (note: CustomerNote) => {
      if (!query.data) return;
      await updateCustomer(token, customerId, {
        notes: {
          ...query.data.notes,
          items: query.data.notes.items.filter((item) => item.id !== note.id),
        },
      });
    },
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  function openEditor(note: CustomerNote | null) {
    setDraft(note?.content ?? '');
    setEditor({ open: true, note });
  }

  function closeEditor() {
    if (save.isPending) return;
    setDraft('');
    setEditor(CLOSED_EDITOR);
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title={`${query.data?.name ?? '고객'} 메모`}
        showMenu={false}
        showBack
        onBackPress={onBackPress}
      />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Inline justify="space-between" align="flex-start">
            <View style={styles.grow}>
              <AppText variant="title">고객 메모</AppText>
              <AppText variant="caption">
                {query.data?.name ?? `고객 #${customerId}`}
              </AppText>
            </View>
            <Button
              label="+ 메모"
              size="sm"
              onPress={() => openEditor(null)}
            />
          </Inline>

          {query.isError ? (
            <ErrorState
              title="고객 메모를 불러오지 못했습니다"
              message={
                query.error instanceof Error
                  ? query.error.message
                  : '잠시 후 다시 시도해 주세요.'
              }
              onRetry={() => void query.refetch()}
            />
          ) : null}

          {query.data?.notes.items.map((note) => (
            <Card key={note.id} variant="outlined" padding="sm">
              <Stack gap="sm">
                <AppText>{note.content}</AppText>
                <AppText variant="caption">
                  {new Date(note.createdAt).toLocaleString('ko-KR')}
                </AppText>
                <Inline>
                  <Button
                    label="수정"
                    size="sm"
                    variant="secondary"
                    onPress={() => openEditor(note)}
                  />
                  <Button
                    label="삭제"
                    size="sm"
                    variant="danger"
                    onPress={() => setDeleting(note)}
                  />
                </Inline>
              </Stack>
            </Card>
          ))}

          {query.data && !query.data.notes.items.length ? (
            <Card variant="outlined" padding="sm">
              <AppText align="center" color="textSecondary" style={styles.compactEmpty}>
                등록된 고객 메모가 없습니다.
              </AppText>
            </Card>
          ) : null}
        </ScrollView>
      </Screen>

      <ModalShell
        open={editor.open}
        title={editor.note ? '메모 수정' : '메모 추가'}
        subtitle={query.data?.name}
        busy={save.isPending}
        onRequestClose={closeEditor}
        headerAction={
          <Button label="닫기" size="sm" variant="ghost" onPress={closeEditor} />
        }
        footer={
          <Inline>
            <Button
              label="취소"
              variant="secondary"
              disabled={save.isPending}
              onPress={closeEditor}
              style={styles.grow}
            />
            <Button
              label={editor.note ? '수정 저장' : '메모 추가'}
              loading={save.isPending}
              disabled={!draft.trim()}
              onPress={() => save.mutate()}
              style={styles.grow}
            />
          </Inline>
        }
      >
        <TextField
          label="메모 내용"
          value={draft}
          onChangeText={setDraft}
          multiline
          numberOfLines={8}
          maxLength={2000}
          placeholder="고객 관련 메모를 입력하세요"
        />
        {save.isError ? (
          <AppText color="danger">
            {save.error instanceof Error ? save.error.message : '메모를 저장하지 못했습니다.'}
          </AppText>
        ) : null}
      </ModalShell>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="고객 메모 삭제"
        message="이 메모를 삭제하시겠습니까?"
        confirmLabel="삭제"
        tone="danger"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => (deleting ? remove.mutateAsync(deleting) : undefined)}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    grow: { flex: 1 },
    content: {
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
      gap: theme.layout.compactListGap,
    },
    compactEmpty: {
      paddingVertical: theme.spacing.md,
    },
  });
}
