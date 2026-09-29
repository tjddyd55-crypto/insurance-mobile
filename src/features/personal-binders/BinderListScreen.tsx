import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
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
import {
  binderActionMessage,
  BINDER_API_UNAVAILABLE_MESSAGE,
  BINDER_API_UNAVAILABLE_TITLE,
  isBinderApiUnavailable,
  isBinderConflict,
} from './binderMessages';
import {
  createPersonalBinder,
  deletePersonalBinder,
  deletePersonalBinderMaterial,
  deleteStorageFile,
  duplicatePersonalBinder,
  listPersonalBinderMaterials,
  listPersonalBinders,
  renamePersonalBinderMaterial,
  uploadPersonalBinderMaterial,
} from './personalBinderApi';
import {
  formatBinderUpdatedAt,
  formatFileSize,
  isPdfAsset,
  maxBinderPdfBytes,
} from './personalBinderModel';
import { personalBinderQueryKeys } from './queryKeys';
import type { PersonalBinderMaterial, PersonalBinderSummary } from './types';

type BinderForm =
  | { mode: 'create'; title: string; description: string }
  | { mode: 'duplicate'; sourceId: string; title: string };

export function BinderListScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'binders' | 'materials'>(params.tab === 'materials' ? 'materials' : 'binders');
  const [form, setForm] = useState<BinderForm | null>(null);
  const [rename, setRename] = useState<PersonalBinderMaterial | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PersonalBinderSummary | PersonalBinderMaterial | null>(null);

  const binders = useQuery({
    queryKey: personalBinderQueryKeys.all,
    queryFn: () => listPersonalBinders(token),
    enabled: Boolean(token),
  });
  const materials = useQuery({
    queryKey: personalBinderQueryKeys.materials,
    queryFn: () => listPersonalBinderMaterials(token),
    enabled: Boolean(token),
  });
  const unavailable = isBinderApiUnavailable(binders.error) || isBinderApiUnavailable(materials.error);

  const refresh = async () => {
    await Promise.all([binders.refetch(), materials.refetch()]);
  };

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: personalBinderQueryKeys.all });
    await queryClient.invalidateQueries({ queryKey: personalBinderQueryKeys.materials });
  };

  return (
    <View style={styles.root}>
      <AppHeader title="내 바인더" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={binders.isRefetching || materials.isRefetching}
              onRefresh={() => void refresh()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Stack gap="sm">
            <AppText color="textSecondary">상담 자료를 조합해 나만의 디지털 상담 책자를 만드세요.</AppText>
            <Inline gap="sm">
              <Button label="바인더" variant={tab === 'binders' ? 'primary' : 'secondary'} onPress={() => setTab('binders')} style={styles.grow} />
              <Button label="자료 보관함" variant={tab === 'materials' ? 'primary' : 'secondary'} onPress={() => setTab('materials')} style={styles.grow} />
            </Inline>
            {tab === 'binders' ? (
              <Button label="새 바인더 만들기" onPress={() => setForm({ mode: 'create', title: '', description: '' })} />
            ) : (
              <Button label="PDF 업로드" onPress={() => void uploadPdf()} />
            )}
            {notice ? <AppText color="danger">{notice}</AppText> : null}
          </Stack>
          {unavailable ? (
            <EmptyState title={BINDER_API_UNAVAILABLE_TITLE} message={BINDER_API_UNAVAILABLE_MESSAGE} />
          ) : tab === 'binders' ? (
            <BinderCards
              loading={binders.isLoading}
              error={binders.error}
              rows={binders.data ?? []}
              onRetry={() => void binders.refetch()}
              onOpen={(id) => router.push(`/customer-consulting/personal-binders/${id}/view` as never)}
              onEdit={(id) => router.push(`/customer-consulting/personal-binders/${id}/edit` as never)}
              onDuplicate={(row) => setForm({ mode: 'duplicate', sourceId: row.id, title: `${row.title} 복사본` })}
              onDelete={setPendingDelete}
            />
          ) : (
            <MaterialCards
              loading={materials.isLoading}
              error={materials.error}
              rows={materials.data ?? []}
              onRetry={() => void materials.refetch()}
              onRename={(row) => {
                setRename(row);
                setRenameTitle(row.title);
              }}
              onDelete={setPendingDelete}
            />
          )}
        </ScrollView>
      </Screen>
      <BinderFormModal
        form={form}
        busy={busy}
        onChange={setForm}
        onClose={() => setForm(null)}
        onSubmit={() => void submitForm(invalidate)}
      />
      <ModalShell
        open={rename != null}
        title="자료 제목 변경"
        presentation="dialog"
        busy={busy}
        onRequestClose={() => setRename(null)}
        footer={<Inline gap="sm"><Button label="취소" variant="secondary" onPress={() => setRename(null)} style={styles.grow} /><Button label="저장" loading={busy} onPress={() => void submitRename(invalidate)} style={styles.grow} /></Inline>}
      >
        <TextField accessibilityLabel="자료 제목" value={renameTitle} onChangeText={setRenameTitle} />
      </ModalShell>
      <ConfirmDialog
        open={pendingDelete != null}
        title={'sectionCount' in (pendingDelete ?? {}) ? '바인더를 삭제할까요?' : '자료를 삭제할까요?'}
        message={deleteMessage(pendingDelete)}
        confirmLabel={'binderCount' in (pendingDelete ?? {}) && (pendingDelete as PersonalBinderMaterial).binderCount ? '확인' : '삭제'}
        tone="danger"
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete(invalidate)}
      />
    </View>
  );

  async function uploadPdf() {
    setNotice('');
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!isPdfAsset(asset.name, asset.mimeType) || (asset.size ?? 0) > maxBinderPdfBytes()) {
      setNotice('PDF 파일만 업로드할 수 있으며 25MB 이하여야 합니다.');
      return;
    }
    setBusy(true);
    try {
      await uploadPersonalBinderMaterial(token, asset, asset.name.replace(/\.pdf$/i, ''));
      await invalidate();
      setTab('materials');
    } catch (error) {
      setNotice(binderActionMessage(error, '업로드에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  async function submitForm(done: () => Promise<void>) {
    if (!form || !form.title.trim() || busy) return;
    setBusy(true);
    setNotice('');
    try {
      if (form.mode === 'create') {
        const created = await createPersonalBinder(token, { title: form.title.trim(), description: form.description.trim() });
        setForm(null);
        await done();
        router.push(`/customer-consulting/personal-binders/${created.id}/edit` as never);
      } else {
        const copied = await duplicatePersonalBinder(token, form.sourceId, form.title.trim());
        setForm(null);
        await done();
        router.push(`/customer-consulting/personal-binders/${copied.id}/edit` as never);
      }
    } catch (error) {
      setNotice(binderActionMessage(error, '바인더를 저장하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  async function submitRename(done: () => Promise<void>) {
    if (!rename || !renameTitle.trim() || busy) return;
    setBusy(true);
    try {
      await renamePersonalBinderMaterial(token, rename.id, renameTitle.trim());
      setRename(null);
      await done();
    } catch (error) {
      setNotice(binderActionMessage(error, '자료 이름을 변경하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(done: () => Promise<void>) {
    const target = pendingDelete;
    if (!target || busy) return;
    if ('binderCount' in target && (target.binderCount ?? 0) > 0) {
      setNotice(`이 자료는 ${target.binderCount}개의 바인더에서 사용 중이므로 삭제할 수 없습니다.`);
      setPendingDelete(null);
      return;
    }
    setBusy(true);
    try {
      if ('sectionCount' in target) {
        await deletePersonalBinder(token, target.id);
      } else {
        const result = await deletePersonalBinderMaterial(token, target.id);
        await deleteStorageFile(token, result.fileId);
      }
      setPendingDelete(null);
      await done();
    } catch (error) {
      setNotice(isBinderConflict(error)
        ? binderActionMessage(error, '사용 중인 자료는 삭제할 수 없습니다.')
        : binderActionMessage(error, '삭제하지 못했습니다.'));
      setPendingDelete(null);
    } finally {
      setBusy(false);
    }
  }
}

function deleteMessage(target: PersonalBinderSummary | PersonalBinderMaterial | null): string {
  if (!target) return '';
  if ('sectionCount' in target) {
    return `${target.title}의 섹션과 상담 구성이 삭제됩니다. 원본 PDF는 자료 보관함에 유지됩니다.`;
  }
  if ((target.binderCount ?? 0) > 0) {
    return `이 자료는 ${target.binderCount}개의 바인더에서 사용 중이므로 삭제할 수 없습니다.`;
  }
  return `${target.title} 원본 PDF도 함께 삭제됩니다.`;
}

function BinderCards({
  loading, error, rows, onRetry, onOpen, onEdit, onDuplicate, onDelete,
}: {
  loading: boolean;
  error: unknown;
  rows: PersonalBinderSummary[];
  onRetry: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (row: PersonalBinderSummary) => void;
  onDelete: (row: PersonalBinderSummary) => void;
}) {
  if (loading) return <LoadingState message="내 바인더를 불러오는 중…" />;
  if (error) {
    return <ErrorState title="내 바인더를 불러오지 못했습니다" message={binderActionMessage(error, '잠시 후 다시 시도해 주세요.')} onRetry={onRetry} />;
  }
  if (!rows.length) {
    return <EmptyState title="아직 만든 바인더가 없습니다." message="상담 목적에 맞는 첫 번째 바인더를 만들어 보세요." />;
  }
  return (
    <Stack gap="sm">
      {rows.map((binder) => (
        <Card key={binder.id}>
          <Stack gap="sm">
            <AppText variant="heading">{binder.title}</AppText>
            <AppText color="textSecondary">{binder.description || '설명 없음'}</AppText>
            <AppText variant="caption" color="textMuted">
              섹션 {binder.sectionCount} · 자료 {binder.materialCount} · 상담 페이지 {binder.pageCount}
            </AppText>
            <AppText variant="caption" color="textMuted">수정 {formatBinderUpdatedAt(binder.updatedAt)}</AppText>
            <Inline gap="sm" wrap>
              <Button label="상담 시작" size="sm" onPress={() => onOpen(binder.id)} />
              <Button label="편집" size="sm" variant="secondary" onPress={() => onEdit(binder.id)} />
              <Button label="복제" size="sm" variant="action" onPress={() => onDuplicate(binder)} />
              <Button label="삭제" size="sm" variant="danger" onPress={() => onDelete(binder)} />
            </Inline>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function MaterialCards({
  loading, error, rows, onRetry, onRename, onDelete,
}: {
  loading: boolean;
  error: unknown;
  rows: PersonalBinderMaterial[];
  onRetry: () => void;
  onRename: (row: PersonalBinderMaterial) => void;
  onDelete: (row: PersonalBinderMaterial) => void;
}) {
  if (loading) return <LoadingState message="자료를 불러오는 중…" />;
  if (error && !isBinderApiUnavailable(error)) {
    return <ErrorState title="자료를 불러오지 못했습니다" message={binderActionMessage(error, '잠시 후 다시 시도해 주세요.')} onRetry={onRetry} />;
  }
  if (!rows.length) {
    return <EmptyState title="자료 보관함이 비어 있습니다." message="PDF를 한 번 업로드하면 여러 바인더에서 재사용할 수 있습니다." />;
  }
  return (
    <Stack gap="sm">
      {rows.map((material) => (
        <Card key={material.id}>
          <Stack gap="xs">
            <AppText variant="bodyStrong">{material.title}</AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>{material.originalFileName}</AppText>
            <AppText variant="caption" color="textMuted">
              {material.pageCount}페이지 · {formatFileSize(material.fileSize)} · 바인더 {material.binderCount ?? 0}개
            </AppText>
            <Inline gap="sm" wrap>
              <Button label="제목 변경" size="sm" variant="action" onPress={() => onRename(material)} />
              <Button label="삭제" size="sm" variant="danger" onPress={() => onDelete(material)} />
            </Inline>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function BinderFormModal({
  form, busy, onChange, onClose, onSubmit,
}: {
  form: BinderForm | null;
  busy: boolean;
  onChange: (form: BinderForm | null) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <ModalShell
      open={form != null}
      title={form?.mode === 'duplicate' ? '바인더 복제' : '새 바인더 만들기'}
      presentation="dialog"
      busy={busy}
      onRequestClose={onClose}
      footer={(
        <Inline gap="sm">
          <Button label="취소" variant="secondary" onPress={onClose} style={styles.grow} />
          <Button label={form?.mode === 'duplicate' ? '복제' : '만들기'} loading={busy} disabled={!form?.title.trim()} onPress={onSubmit} style={styles.grow} />
        </Inline>
      )}
    >
      <Stack gap="sm">
        <TextField accessibilityLabel="바인더 이름" placeholder="바인더 이름" value={form?.title ?? ''} onChangeText={(title) => onChange(form ? { ...form, title } : form)} />
        {form?.mode === 'create' ? (
          <TextField accessibilityLabel="바인더 설명" placeholder="설명 (선택)" value={form.description} onChangeText={(description) => onChange({ ...form, description })} />
        ) : null}
      </Stack>
    </ModalShell>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: {
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
      gap: theme.spacing.md,
    },
    grow: { flex: 1, minWidth: 0 },
  });
}