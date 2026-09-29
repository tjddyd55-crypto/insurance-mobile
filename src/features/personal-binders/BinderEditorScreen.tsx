import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  ModalShell,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { binderActionMessage } from './binderMessages';
import {
  addPersonalBinderItem,
  createPersonalBinderSection,
  deletePersonalBinderItem,
  deletePersonalBinderSection,
  getPersonalBinder,
  listPersonalBinderMaterials,
  renamePersonalBinderSection,
  reorderPersonalBinderItems,
  reorderPersonalBinderSections,
  sharePersonalBinderPdf,
  updatePersonalBinder,
  updatePersonalBinderItemPages,
} from './personalBinderApi';
import {
  displayPageSelection,
  formatSelectedPages,
  moveRows,
  pageSelectionForSave,
} from './personalBinderModel';
import { personalBinderQueryKeys } from './queryKeys';
import { usePageImageLink } from './usePageImageLink';
import { BinderPageSelectionModal } from './BinderPageSelectionModal';
import type { PersonalBinderItem, PersonalBinderMaterial, PersonalBinderSection } from './types';

type PageTarget = {
  sectionId: string;
  itemId?: string;
  material: PersonalBinderMaterial;
  initialSelection: number[] | null;
};

export function BinderEditorScreen({ binderId }: { binderId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: personalBinderQueryKeys.detail(binderId),
    queryFn: () => getPersonalBinder(token, binderId),
    enabled: Boolean(token && binderId),
  });
  const materials = useQuery({
    queryKey: personalBinderQueryKeys.materials,
    queryFn: () => listPersonalBinderMaterials(token),
    enabled: Boolean(token),
  });
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sectionForm, setSectionForm] = useState<{ mode: 'create' | 'rename'; sectionId?: string; title: string } | null>(null);
  const [materialSectionId, setMaterialSectionId] = useState<string | null>(null);
  const [pageTarget, setPageTarget] = useState<PageTarget | null>(null);
  const [deleteSection, setDeleteSection] = useState<PersonalBinderSection | null>(null);

  const binder = query.data;
  const titleValue = title ?? binder?.title ?? '';
  const descriptionValue = description ?? binder?.description ?? '';

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: personalBinderQueryKeys.detail(binderId) });
    await queryClient.invalidateQueries({ queryKey: personalBinderQueryKeys.all });
  };

  if (query.isLoading) {
    return <View style={styles.root}><AppHeader title="바인더 편집" showBack showMenu={false} /><LoadingState message="바인더를 불러오는 중…" /></View>;
  }
  if (!binder) {
    return (
      <View style={styles.root}>
        <AppHeader title="바인더 편집" showBack showMenu={false} />
        <ErrorState title="바인더를 찾을 수 없습니다" message={binderActionMessage(query.error, '목록으로 돌아가 주세요.')} onRetry={() => void query.refetch()} />
      </View>
    );
  }

  const sections = binder.sections.slice().sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <View style={styles.root}>
      <AppHeader title="바인더 편집" showBack showMenu={false} />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Stack gap="sm">
              <TextField accessibilityLabel="바인더 이름" label="바인더 이름" value={titleValue} onChangeText={setTitle} />
              <TextField accessibilityLabel="바인더 설명" label="설명" value={descriptionValue} onChangeText={setDescription} />
              <Inline gap="sm" wrap>
                <Button label="저장" size="sm" loading={busy} onPress={() => void saveMeta()} />
                <Button label="상담 시작" size="sm" variant="secondary" onPress={() => router.push(`/customer-consulting/personal-binders/${binder.id}/view` as never)} />
                <Button label="전체 PDF" size="sm" variant="action" loading={exporting} onPress={() => void exportPdf()} />
              </Inline>
            </Stack>
          </Card>
          {notice ? <AppText color="danger">{notice}</AppText> : null}
          <Button label="섹션 추가" variant="secondary" onPress={() => setSectionForm({ mode: 'create', title: '' })} />
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              token={token}
              section={section}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              onRename={() => setSectionForm({ mode: 'rename', sectionId: section.id, title: section.title })}
              onMove={(direction) => void moveSection(section, direction)}
              onDelete={() => setDeleteSection(section)}
              onAdd={() => setMaterialSectionId(section.id)}
              onEditPages={(item) => setPageTarget({
                sectionId: section.id,
                itemId: item.id,
                material: item.material,
                initialSelection: item.pageSelection,
              })}
              onMoveItem={(item, direction) => void moveItem(section, item, direction)}
              onRemoveItem={(item) => void removeItem(item)}
            />
          ))}
        </ScrollView>
      </Screen>
      <SectionNameModal form={sectionForm} busy={busy} onChange={setSectionForm} onSubmit={() => void saveSection()} />
      <MaterialPicker
        open={materialSectionId != null}
        materials={materials.data ?? []}
        onClose={() => setMaterialSectionId(null)}
        onPick={(material) => {
          if (!materialSectionId) return;
          setPageTarget({ sectionId: materialSectionId, material, initialSelection: null });
          setMaterialSectionId(null);
        }}
        onOpenLibrary={() => router.push('/customer-consulting/personal-binders?tab=materials' as never)}
      />
      <BinderPageSelectionModal
        open={pageTarget != null}
        title={pageTarget?.material.title ?? ''}
        pageCount={pageTarget?.material.pageCount ?? 0}
        initialSelection={pageTarget?.initialSelection ?? null}
        busy={busy}
        onClose={() => setPageTarget(null)}
        onConfirm={(selection) => void confirmPages(selection)}
      />
      <ConfirmDialog
        open={deleteSection != null}
        title="섹션을 삭제할까요?"
        message={`${deleteSection?.title ?? ''} 안의 자료 연결도 함께 삭제됩니다. 원본 PDF는 유지됩니다.`}
        confirmLabel="삭제"
        tone="danger"
        busy={busy}
        onCancel={() => setDeleteSection(null)}
        onConfirm={() => void confirmRemoveSection()}
      />
    </View>
  );

  async function saveMeta() {
    if (!titleValue.trim() || busy) return;
    setBusy(true);
    setNotice('');
    try {
      await updatePersonalBinder(token, binderId, { title: titleValue.trim(), description: descriptionValue.trim() });
      setTitle(null);
      setDescription(null);
      await refresh();
    } catch (error) {
      setNotice(binderActionMessage(error, '바인더를 저장하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    setNotice('');
    try {
      await sharePersonalBinderPdf(token, binderId, titleValue || binder?.title || '내 바인더');
    } catch (error) {
      setNotice(binderActionMessage(error, '바인더 PDF를 만들지 못했습니다.'));
    } finally {
      setExporting(false);
    }
  }

  async function saveSection() {
    if (!sectionForm?.title.trim() || busy) return;
    setBusy(true);
    try {
      if (sectionForm.mode === 'create') await createPersonalBinderSection(token, binderId, sectionForm.title.trim());
      else if (sectionForm.sectionId) await renamePersonalBinderSection(token, sectionForm.sectionId, sectionForm.title.trim());
      setSectionForm(null);
      await refresh();
    } catch (error) {
      setNotice(binderActionMessage(error, '섹션을 저장하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  async function moveSection(section: PersonalBinderSection, direction: -1 | 1) {
    const index = sections.findIndex((entry) => entry.id === section.id);
    const next = moveRows(sections, index, index + direction);
    if (next === sections) return;
    await reorderPersonalBinderSections(token, binderId, next.map((entry) => entry.id));
    await refresh();
  }

  async function moveItem(section: PersonalBinderSection, item: PersonalBinderItem, direction: -1 | 1) {
    const ordered = section.items.slice().sort((left, right) => left.sortOrder - right.sortOrder);
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const next = moveRows(ordered, index, index + direction);
    if (next === ordered) return;
    await reorderPersonalBinderItems(token, section.id, next.map((entry) => entry.id));
    await refresh();
  }

  async function removeItem(item: PersonalBinderItem) {
    setNotice('');
    try {
      await deletePersonalBinderItem(token, item.id);
      await refresh();
    } catch (error) {
      setNotice(binderActionMessage(error, '자료를 빼지 못했습니다.'));
    }
  }

  async function confirmRemoveSection() {
    if (!deleteSection) return;
    setBusy(true);
    try {
      await deletePersonalBinderSection(token, deleteSection.id);
      setDeleteSection(null);
      await refresh();
    } catch (error) {
      setNotice(binderActionMessage(error, '섹션을 삭제하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmPages(selection: number[]) {
    if (!pageTarget) return;
    const pageSelection = pageSelectionForSave(selection, pageTarget.material.pageCount);
    if (selection.length === 0) {
      setNotice('페이지를 한 장 이상 선택해 주세요.');
      return;
    }
    setBusy(true);
    try {
      if (pageTarget.itemId) await updatePersonalBinderItemPages(token, pageTarget.itemId, pageSelection);
      else await addPersonalBinderItem(token, pageTarget.sectionId, { materialId: pageTarget.material.id, pageSelection });
      setPageTarget(null);
      await refresh();
    } catch (error) {
      setNotice(binderActionMessage(error, '페이지를 저장하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }
}

function SectionCard({
  token, section, isFirst, isLast, onRename, onMove, onDelete, onAdd, onEditPages, onMoveItem, onRemoveItem,
}: {
  token: string | null;
  section: PersonalBinderSection;
  isFirst: boolean;
  isLast: boolean;
  onRename: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onAdd: () => void;
  onEditPages: (item: PersonalBinderItem) => void;
  onMoveItem: (item: PersonalBinderItem, direction: -1 | 1) => void;
  onRemoveItem: (item: PersonalBinderItem) => void;
}) {
  const items = section.items.slice().sort((left, right) => left.sortOrder - right.sortOrder);
  return (
    <Card>
      <Stack gap="sm">
        <AppText variant="heading">{section.title}</AppText>
        <Inline gap="sm" wrap>
          <Button label="이름" size="sm" variant="action" onPress={onRename} />
          <Button label="위로" size="sm" variant="secondary" disabled={isFirst} onPress={() => onMove(-1)} />
          <Button label="아래로" size="sm" variant="secondary" disabled={isLast} onPress={() => onMove(1)} />
          <Button label="삭제" size="sm" variant="danger" onPress={onDelete} />
          <Button label="자료 추가" size="sm" onPress={onAdd} />
        </Inline>
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            token={token}
            item={item}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onEditPages={() => onEditPages(item)}
            onMove={(direction) => onMoveItem(item, direction)}
            onRemove={() => onRemoveItem(item)}
          />
        ))}
      </Stack>
    </Card>
  );
}

function ItemRow({
  token, item, isFirst, isLast, onEditPages, onMove, onRemove,
}: {
  token: string | null;
  item: PersonalBinderItem;
  isFirst: boolean;
  isLast: boolean;
  onEditPages: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const pages = displayPageSelection(item.pageSelection, item.material.pageCount);
  const preview = pages.slice(0, 4);
  return (
    <Stack gap="xs">
      <AppText variant="bodyStrong">{item.material.title}</AppText>
      <AppText variant="caption" color="textSecondary">
        {item.pageSelection == null ? `전체 ${item.material.pageCount}페이지` : formatSelectedPages(pages)}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Inline gap="sm">
          {preview.map((page) => (
            <PageThumb key={page} token={token} material={item.material} pageNumber={page} />
          ))}
          {pages.length > preview.length ? (
            <AppText variant="caption" color="textMuted">+{pages.length - preview.length}</AppText>
          ) : null}
        </Inline>
      </ScrollView>
      <Inline gap="sm" wrap>
        <Button label="페이지" size="sm" variant="secondary" onPress={onEditPages} />
        <Button label="위로" size="sm" variant="secondary" disabled={isFirst} onPress={() => onMove(-1)} />
        <Button label="아래로" size="sm" variant="secondary" disabled={isLast} onPress={() => onMove(1)} />
        <Button label="빼기" size="sm" variant="danger" onPress={onRemove} />
      </Inline>
    </Stack>
  );
}

function PageThumb({
  token, material, pageNumber,
}: {
  token: string | null;
  material: PersonalBinderMaterial;
  pageNumber: number;
}) {
  const request = useMemo(
    () => ({ scope: 'material-thumb' as const, materialId: material.id, page: pageNumber }),
    [material.id, pageNumber],
  );
  const { uri } = usePageImageLink(token, request);
  const theme = useAppTheme();
  return (
    <View style={{ width: 72, height: 96, borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width: 72, height: 96 }} resizeMode="cover" accessibilityLabel={`${pageNumber}페이지 썸네일`} /> : <AppText variant="caption">{pageNumber}</AppText>}
    </View>
  );
}

function SectionNameModal({
  form, busy, onChange, onSubmit,
}: {
  form: { mode: 'create' | 'rename'; title: string } | null;
  busy: boolean;
  onChange: (form: { mode: 'create' | 'rename'; sectionId?: string; title: string } | null) => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      open={form != null}
      title={form?.mode === 'rename' ? '섹션 이름 변경' : '섹션 추가'}
      presentation="dialog"
      busy={busy}
      onRequestClose={() => onChange(null)}
      footer={<Button label="저장" loading={busy} disabled={!form?.title.trim()} onPress={onSubmit} />}
    >
      <TextField accessibilityLabel="섹션 이름" placeholder="섹션 이름" value={form?.title ?? ''} onChangeText={(value) => onChange(form ? { ...form, title: value } : form)} />
    </ModalShell>
  );
}

function MaterialPicker({
  open, materials, onClose, onPick, onOpenLibrary,
}: {
  open: boolean;
  materials: PersonalBinderMaterial[];
  onClose: () => void;
  onPick: (material: PersonalBinderMaterial) => void;
  onOpenLibrary: () => void;
}) {
  return (
    <ModalShell open={open} title="자료 선택" presentation="dialog" onRequestClose={onClose} scroll>
      <Stack gap="sm">
        {!materials.length ? <AppText color="textSecondary">자료 보관함이 비어 있습니다. PDF를 먼저 업로드해 주세요.</AppText> : null}
        {materials.map((material) => (
          <Button key={material.id} label={`${material.title} · ${material.pageCount}페이지`} variant="secondary" onPress={() => onPick(material)} />
        ))}
        <Button label="자료 보관함" variant="action" onPress={onOpenLibrary} />
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
  });
}