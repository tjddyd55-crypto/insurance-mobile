import { useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Button, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { createMemo, deleteMemo, listMemos, updateMemo } from './memosApi';
import { memoQueryKeys } from './queryKeys';

export function MemoFormScreen({
  mode,
  memoId,
}: { mode: 'create'; memoId?: never } | { mode: 'edit'; memoId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [initialized, setInitialized] = useState(mode === 'create');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const query = useQuery({
    queryKey: memoQueryKeys.all,
    queryFn: () => listMemos(token),
    enabled: mode === 'edit' && Boolean(token),
  });
  const editingMemo = mode === 'edit' ? query.data?.find((memo) => memo.id === memoId) ?? null : null;

  useEffect(() => {
    if (mode !== 'edit' || !editingMemo || initialized) return;
    setContent(editingMemo.content);
    setInitialContent(editingMemo.content);
    setInitialized(true);
  }, [editingMemo, initialized, mode]);
  const dirty = initialized && content !== initialContent;

  const saveMutation = useMutation({
    mutationFn: () => mode === 'create' ? createMemo(token, content) : updateMemo(token, memoId, content),
    onSuccess: async () => {
      setInitialContent(content);
      await queryClient.invalidateQueries({ queryKey: memoQueryKeys.all });
      router.replace('/memo');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteMemo(token, memoId ?? ''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: memoQueryKeys.all });
      router.replace('/memo');
    },
  });

  const requestBack = () => {
    if (dirty && !saveMutation.isPending) setDiscardOpen(true);
    else router.back();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestBack();
      return true;
    });
    return () => subscription.remove();
  });

  if (mode === 'edit' && query.isLoading) return <LoadingState message="메모를 불러오는 중…" />;
  if (mode === 'edit' && (query.isError || (!editingMemo && query.isSuccess))) {
    return (
      <ErrorState
        title="메모를 불러오지 못했습니다"
        message={query.error instanceof Error ? query.error.message : '메모를 찾을 수 없습니다.'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const error = saveMutation.error ?? deleteMutation.error;
  const busy = saveMutation.isPending || deleteMutation.isPending;
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="스티커 메모" showMenu={false} showBack onBackPress={requestBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          accessibilityLabel="메모 내용"
          multiline
          autoFocus
          value={content}
          onChangeText={(value) => setContent(value.slice(0, 50_000))}
            placeholder="메모 내용을 입력하세요."
          style={styles.editor}
        />
        {error ? (
          <AppText color="danger">{error instanceof Error ? error.message : '메모 요청을 처리하지 못했습니다.'}</AppText>
        ) : null}
        {mode === 'edit' ? (
          <Button label="메모 삭제" variant="danger" disabled={busy} onPress={() => setDeleteOpen(true)} />
        ) : null}
      </ScrollView>
      <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
        <View style={styles.footer}>
          <Button label="취소" variant="secondary" disabled={busy} onPress={requestBack} style={styles.grow} />
          <Button label="저장" loading={saveMutation.isPending} onPress={() => saveMutation.mutate()} style={styles.grow} />
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
          setInitialContent(content);
          router.back();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="메모 삭제"
        message="삭제한 메모는 복구할 수 없습니다. 계속하시겠습니까?"
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
    content: { flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.md },
    editor: { minHeight: 360, backgroundColor: theme.colors.surface },
    footerSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    footer: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
    grow: { flex: 1 },
  });
}
