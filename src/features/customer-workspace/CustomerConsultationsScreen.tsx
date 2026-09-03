import { useEffect, useMemo, useState } from 'react';
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
import { getCustomer } from '../customers/customersApi';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';
import {
  createConsultation,
  deleteConsultation,
  listConsultations,
  updateConsultation,
} from './customerWorkspaceApi';
import { todayYmd } from './customerWorkspaceModel';
import type { Consultation } from './types';

type ConsultationEditorState = {
  open: boolean;
  row: Consultation | null;
};

const CLOSED_EDITOR: ConsultationEditorState = { open: false, row: null };

export function CustomerConsultationsScreen({ customerId }: { customerId: number }) {
  const { token } = useAuth();
  const onBackPress = useCustomerDetailBack(customerId);
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editor, setEditor] = useState<ConsultationEditorState>(CLOSED_EDITOR);
  const [deleting, setDeleting] = useState<Consultation | null>(null);
  const queryKey = ['customer-consultations', customerId] as const;
  const customer = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token && customerId),
  });
  const query = useQuery({
    queryKey,
    queryFn: () => listConsultations(token, customerId),
    enabled: Boolean(token && customerId),
  });
  const remove = useMutation({
    mutationFn: (row: Consultation) => deleteConsultation(token, customerId, row.id),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <View style={styles.root}>
      <AppHeader
        title={`${customer.data?.name ?? '고객'} 상담`}
        showMenu={false}
        showBack
        onBackPress={onBackPress}
      />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
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
              <AppText variant="title">상담 이력</AppText>
              <AppText variant="caption">
                {customer.data?.name ?? `고객 #${customerId}`}
              </AppText>
            </View>
            <Button
              label="+ 상담 기록"
              size="sm"
              onPress={() => setEditor({ open: true, row: null })}
            />
          </Inline>

          {query.isError ? (
            <ErrorState
              title="상담 이력을 불러오지 못했습니다"
              message={
                query.error instanceof Error
                  ? query.error.message
                  : '잠시 후 다시 시도해 주세요.'
              }
              onRetry={() => void query.refetch()}
            />
          ) : null}

          {!query.isLoading && !query.data?.length ? (
            <Card variant="outlined" padding="sm">
              <AppText align="center" color="textSecondary" style={styles.compactEmpty}>
                등록된 상담 이력이 없습니다.
              </AppText>
            </Card>
          ) : null}

          {query.data?.map((row) => (
            <Card key={row.id} variant="outlined" padding="sm">
              <Stack gap="sm">
                <AppText variant="bodyStrong">
                  {row.consultationDate || row.createdAt.slice(0, 10)}
                </AppText>
                <AppText>{row.body || '상담 내용 없음'}</AppText>
                <Inline>
                  <Button
                    label="수정"
                    size="sm"
                    variant="secondary"
                    onPress={() => setEditor({ open: true, row })}
                  />
                  <Button
                    label="삭제"
                    size="sm"
                    variant="danger"
                    onPress={() => setDeleting(row)}
                  />
                </Inline>
              </Stack>
            </Card>
          ))}
        </ScrollView>
      </Screen>

      <ConsultationEditor
        open={editor.open}
        row={editor.row}
        token={token}
        customerId={customerId}
        customerName={customer.data?.name}
        onClose={() => setEditor(CLOSED_EDITOR)}
        onSaved={async () => {
          setEditor(CLOSED_EDITOR);
          await queryClient.invalidateQueries({ queryKey });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="상담 기록 삭제"
        message="이 상담 기록을 삭제하시겠습니까?"
        confirmLabel="삭제"
        tone="danger"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => (deleting ? remove.mutateAsync(deleting) : undefined)}
      />
    </View>
  );
}

function ConsultationEditor({
  open,
  row,
  token,
  customerId,
  customerName,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: Consultation | null;
  token: string | null;
  customerId: number;
  customerName?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [date, setDate] = useState(todayYmd);
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!open) return;
    setDate(row?.consultationDate || todayYmd());
    setBody(row?.body ?? '');
  }, [open, row]);

  const save = useMutation({
    mutationFn: () => {
      // 후속 필드 UI는 제거했지만 기존 저장값을 null overwrite 하지 않는다.
      const payload = {
        body: body.trim(),
        consultationDate: date,
        contactResult: row?.contactResult ?? null,
        nextContactDate: row?.nextContactDate ?? null,
        followUpNote: row?.followUpNote ?? null,
        followUpStatus: row?.followUpStatus ?? null,
      };
      return row
        ? updateConsultation(token, customerId, row.id, payload)
        : createConsultation(token, customerId, payload);
    },
    onSuccess: onSaved,
  });

  return (
    <ModalShell
      open={open}
      title={row ? '상담 수정' : '상담 기록'}
      subtitle={customerName}
      busy={save.isPending}
      onRequestClose={onClose}
      headerAction={
        <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
      }
      footer={
        <Inline>
          <Button
            label="취소"
            variant="secondary"
            disabled={save.isPending}
            onPress={onClose}
            style={styles.grow}
          />
          <Button
            label="저장"
            loading={save.isPending}
            disabled={!body.trim()}
            onPress={() => save.mutate()}
            style={styles.grow}
          />
        </Inline>
      }
    >
      <Card variant="outlined">
        <Stack gap="md">
          <TextField
            label="상담 일자"
            required
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
          <TextField
            label="상담 내용"
            required
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={8}
          />
          {save.isError ? (
            <AppText color="danger">
              {save.error instanceof Error
                ? save.error.message
                : '상담 기록을 저장하지 못했습니다.'}
            </AppText>
          ) : null}
        </Stack>
      </Card>
    </ModalShell>
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
