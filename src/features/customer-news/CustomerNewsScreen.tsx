import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { CustomerNewsPreviewModal, type CustomerNewsPreviewDraft } from './CustomerNewsPreviewModal';
import {
  buildCustomerNewsGalleryUrls,
  canPublishCustomerNews,
  draftAttachmentsToPreviewRows,
  fileDraftsFromDrafts,
  galleryUrlsFromDrafts,
  hydrateDraftAttachmentsFromItem,
  listCardPreviewText,
  localAttachmentToDraft,
  nextDraftSortOrder,
  previewValidationMessage,
  publishValidationMessage,
} from './customerNewsContent';
import { CustomerNewsImageCarousel } from './customerNewsImageCarousel';
import {
  createCustomerNews,
  createNewsComment,
  deleteCustomerNews,
  listCustomerNews,
  listLinkedCustomers,
  listNewsComments,
  updateCustomerNews,
  uploadNewsAttachment,
} from './customerNewsApi';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';
import { attachmentKind, newsScopeLabel, validateNewsAttachment } from './customerNewsModel';
import type { CustomerNewsItem, DraftAttachment, LocalAttachment, NewsAttachment } from './types';

type FormState = {
  content: string;
  sendPush: boolean;
  pinned: boolean;
  attachments: DraftAttachment[];
};
const EMPTY_FORM: FormState = { content: '', sendPush: true, pinned: false, attachments: [] };
type ConfirmState = { type: 'publish' } | { type: 'delete'; item: CustomerNewsItem } | null;

export function CustomerNewsScreen({
  initialScope = 'all',
  initialCustomerId = null,
  showBack = false,
}: {
  initialScope?: 'all' | 'personal';
  initialCustomerId?: number | null;
  showBack?: boolean;
} = {}) {
  const { token } = useAuth();
  const client = useQueryClient();
  const onBackPress = useCustomerDetailBack(initialCustomerId ?? 0);
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const lockedPersonal =
    initialScope === 'personal' && typeof initialCustomerId === 'number' && initialCustomerId > 0;
  const scope: 'all' | 'personal' = lockedPersonal ? 'personal' : 'all';

  const [customerId, setCustomerId] = useState<number | null>(initialCustomerId);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<CustomerNewsPreviewDraft | null>(null);
  const [editing, setEditing] = useState<CustomerNewsItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selected, setSelected] = useState<CustomerNewsItem | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [notice, setNotice] = useState('');

  const linked = useQuery({
    queryKey: ['customer-news', 'linked-customers'],
    queryFn: () => listLinkedCustomers(token),
    enabled: Boolean(token && lockedPersonal),
  });

  useEffect(() => {
    if (!lockedPersonal) return;
    setCustomerId(initialCustomerId);
  }, [initialCustomerId, lockedPersonal]);

  const listKey = ['customer-news', scope, scope === 'personal' ? customerId : null] as const;
  const news = useQuery({
    queryKey: listKey,
    queryFn: () => listCustomerNews(token, scope, scope === 'personal' ? customerId : null),
    enabled: Boolean(token && (scope === 'all' || customerId)),
  });

  const rows = useMemo(
    () =>
      (news.data ?? []).filter(
        (item) =>
          !search.trim() ||
          `${item.content} ${item.targetCustomerName}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [news.data, search],
  );

  async function uploadDraftAttachments(drafts: DraftAttachment[]): Promise<Omit<NewsAttachment, 'id'>[]> {
    const sorted = [...drafts].sort((a, b) => a.sortOrder - b.sortOrder);
    const uploaded: Omit<NewsAttachment, 'id'>[] = [];
    for (const [index, draft] of sorted.entries()) {
      if (draft.localUri) {
        const asset: LocalAttachment = {
          uri: draft.localUri,
          name: draft.fileName,
          mimeType: draft.mimeType,
          size: draft.size,
          kind: draft.kind,
        };
        const row = await uploadNewsAttachment(
          token,
          asset,
          scope,
          scope === 'personal' ? customerId : null,
        );
        uploaded.push({ ...row, sortOrder: index });
        continue;
      }
      if (!draft.url) {
        continue;
      }
      uploaded.push({
        kind: draft.kind,
        url: draft.url,
        objectKey: draft.objectKey,
        fileName: draft.fileName,
        mimeType: draft.mimeType,
        size: draft.size,
        sortOrder: index,
      });
    }
    return uploaded;
  }

  const publish = useMutation({
    mutationFn: async () => {
      const validation = publishValidationMessage(form.content, form.attachments);
      if (validation) {
        throw new Error(validation);
      }
      if (scope === 'personal' && !customerId) {
        throw new Error('받을 고객을 선택해 주세요.');
      }
      const attachments = await uploadDraftAttachments(form.attachments);
      const content = form.content.trim();
      if (editing) {
        await updateCustomerNews(token, editing.id, {
          content,
          sendPush: form.sendPush,
          attachments,
        });
      } else {
        await createCustomerNews(token, {
          content,
          scope,
          targetCustomerId: scope === 'personal' ? customerId : null,
          sendPush: form.sendPush,
          isPinned: form.pinned,
          attachments,
        });
      }
    },
    onSuccess: async () => {
      setConfirm(null);
      setFormOpen(false);
      setPreviewOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setNotice(
        form.sendPush ? '소식지를 게시하고 고객 앱 알림을 요청했습니다.' : '소식지를 게시했습니다.',
      );
      await client.invalidateQueries({ queryKey: ['customer-news'] });
    },
  });

  const remove = useMutation({
    mutationFn: (item: CustomerNewsItem) => deleteCustomerNews(token, item),
    onSuccess: async () => {
      setConfirm(null);
      setSelected(null);
      setNotice('소식지를 삭제했습니다.');
      await client.invalidateQueries({ queryKey: ['customer-news'] });
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  function openEdit(item: CustomerNewsItem) {
    setEditing(item);
    setForm({
      content: item.content,
      sendPush: false,
      pinned: item.isPinned,
      attachments: hydrateDraftAttachmentsFromItem(item),
    });
    setFormOpen(true);
  }

  async function chooseFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const nextDrafts = [...form.attachments];
    for (const asset of result.assets) {
      const local: LocalAttachment = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        kind: attachmentKind(asset.mimeType ?? ''),
      };
      const error = validateNewsAttachment(local);
      if (error) {
        setNotice(error);
        continue;
      }
      nextDrafts.push(localAttachmentToDraft(local, nextDraftSortOrder(nextDrafts)));
    }
    setForm((value) => ({ ...value, attachments: nextDrafts }));
  }

  function removeAttachment(key: string) {
    setForm((value) => ({
      ...value,
      attachments: value.attachments.filter((row) => row.key !== key),
    }));
  }

  function openPreview() {
    const validation = previewValidationMessage(form.content, form.attachments);
    if (validation) {
      setNotice(validation);
      return;
    }
    setPreviewDraft({
      content: form.content,
      attachments: draftAttachmentsToPreviewRows(form.attachments),
      isPinned: form.pinned,
    });
    setPreviewOpen(true);
  }

  const audience = linked.data?.find((item) => item.customerId === customerId);
  const headerTitle = lockedPersonal ? '개인메시지' : '고객 앱 소식지';
  const canPublish = canPublishCustomerNews(form.content, form.attachments);

  const listHeader = (
    <View style={styles.listHeader}>
      <Card>
        <Stack gap="md">
          <AppText variant="heading">{headerTitle}</AppText>
          <AppText variant="caption">
            {lockedPersonal
              ? '선택한 고객에게만 개인메시지를 작성하고 댓글을 확인합니다.'
              : '고객 앱에 연결된 전체 고객에게 공지·소식·안내를 게시합니다.'}
          </AppText>
          {lockedPersonal && audience ? (
            <Badge label={`${audience.customerName} · 기기 ${audience.deviceCount}`} tone="info" />
          ) : null}
          <Inline align="flex-end">
            <TextField
              label="검색"
              placeholder="내용 검색"
              value={search}
              onChangeText={setSearch}
              containerStyle={styles.grow}
            />
            <Button label="+ 작성" onPress={openCreate} disabled={scope === 'personal' && !customerId} />
          </Inline>
        </Stack>
      </Card>
      {notice ? (
        <Card variant="filled">
          <AppText color="success">{notice}</AppText>
        </Card>
      ) : null}
      {news.isError ? (
        <ErrorState
          title="고객소식지를 불러오지 못했습니다"
          message={news.error instanceof Error ? news.error.message : '잠시 후 다시 시도해 주세요.'}
          onRetry={() => void news.refetch()}
        />
      ) : null}
      <Inline wrap>
        <Badge label={newsScopeLabel(scope, audience?.customerName)} tone="info" />
        <Badge label={`${rows.length}건`} />
      </Inline>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title={headerTitle}
        showMenu={!showBack}
        showBack={showBack}
        onBackPress={showBack && initialCustomerId ? onBackPress : undefined}
      />
      <Screen padded={false}>
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NewsCard
              item={item}
              onDetail={() => setSelected(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => setConfirm({ type: 'delete', item })}
            />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !news.isLoading ? (
              <Card variant="outlined">
                <AppText color="textSecondary" align="center">게시된 소식지가 없습니다.</AppText>
              </Card>
            ) : null
          }
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={news.isRefetching}
              onRefresh={() => void news.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      </Screen>

      <NewsFormModal
        open={formOpen}
        scope={scope}
        audience={audience}
        editing={editing}
        value={form}
        setValue={setForm}
        busy={publish.isPending}
        error={publish.error}
        canPublish={canPublish}
        onChooseFile={() => void chooseFile()}
        onRemoveAttachment={removeAttachment}
        onClose={() => setFormOpen(false)}
        onPreview={openPreview}
        onSubmit={() => setConfirm({ type: 'publish' })}
      />
      <CustomerNewsPreviewModal
        open={previewOpen}
        draft={previewDraft}
        onClose={() => setPreviewOpen(false)}
      />
      <NewsDetailModal open={Boolean(selected)} item={selected} token={token} onClose={() => setSelected(null)} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === 'delete' ? '소식지 삭제' : form.sendPush ? '게시 및 앱 알림' : '소식지 게시'}
        message={
          confirm?.type === 'delete'
            ? '삭제하면 고객 앱에서도 보이지 않으며 복구할 수 없습니다.'
            : form.sendPush
              ? '소식지를 게시하고 고객 앱 알림을 전송하시겠습니까?'
              : '고객 앱에 소식지를 게시하시겠습니까?'
        }
        confirmLabel={confirm?.type === 'delete' ? '삭제' : '게시'}
        tone={confirm?.type === 'delete' ? 'danger' : 'default'}
        busy={publish.isPending || remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'delete' ? remove.mutateAsync(confirm.item) : publish.mutateAsync()
        }
      />
    </View>
  );
}

function NewsCard({
  item,
  onDetail,
  onEdit,
  onDelete,
}: {
  item: CustomerNewsItem;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card variant="outlined">
      <Stack gap="sm">
        <Inline wrap>
          {item.isPinned ? <Badge label="고정" tone="warning" /> : null}
          <Badge label={newsScopeLabel(item.scope, item.targetCustomerName)} tone="info" />
        </Inline>
        <AppText variant="bodyStrong" numberOfLines={3}>{listCardPreviewText(item)}</AppText>
        <AppText variant="caption">
          {item.updatedAt ? new Date(item.updatedAt).toLocaleString('ko-KR') : '작성일 미확인'} · 첨부{' '}
          {item.attachments?.length ?? 0}개
        </AppText>
        <Inline wrap>
          <Button label="상세·댓글" size="sm" onPress={onDetail} />
          <Button label="수정" size="sm" variant="secondary" onPress={onEdit} />
          <Button label="삭제" size="sm" variant="danger" onPress={onDelete} />
        </Inline>
      </Stack>
    </Card>
  );
}

function NewsFormModal({
  open,
  scope,
  audience,
  editing,
  value,
  setValue,
  busy,
  error,
  canPublish,
  onChooseFile,
  onRemoveAttachment,
  onClose,
  onPreview,
  onSubmit,
}: {
  open: boolean;
  scope: 'all' | 'personal';
  audience?: { customerName: string };
  editing: CustomerNewsItem | null;
  value: FormState;
  setValue: React.Dispatch<React.SetStateAction<FormState>>;
  busy: boolean;
  error: Error | null;
  canPublish: boolean;
  onChooseFile: () => void;
  onRemoveAttachment: (key: string) => void;
  onClose: () => void;
  onPreview: () => void;
  onSubmit: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const imageDrafts = value.attachments.filter((row) => row.kind === 'image');
  const fileDrafts = fileDraftsFromDrafts(value.attachments);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <AppText variant="heading">{editing ? '소식지 수정' : '소식지 작성'}</AppText>
          <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card variant="outlined">
            <Stack gap="md">
              <Badge label={newsScopeLabel(scope, audience?.customerName)} tone="info" />
              <TextField
                label="내용"
                value={value.content}
                onChangeText={(content) => setValue((old) => ({ ...old, content }))}
                multiline
                numberOfLines={10}
              />
              <AppText variant="label">게시 옵션</AppText>
              <Inline wrap>
                <Button
                  label={value.sendPush ? '앱 알림 포함' : '알림 없이 게시'}
                  size="sm"
                  variant={value.sendPush ? 'selected' : 'secondary'}
                  onPress={() => setValue((old) => ({ ...old, sendPush: !old.sendPush }))}
                />
                <Button
                  label={value.pinned ? '상단 고정' : '일반 게시'}
                  size="sm"
                  variant={value.pinned ? 'selected' : 'secondary'}
                  disabled={Boolean(editing)}
                  onPress={() => setValue((old) => ({ ...old, pinned: !old.pinned }))}
                />
              </Inline>
              <AppText variant="label">첨부</AppText>
              <Button label="이미지/PDF 첨부" size="sm" variant="secondary" onPress={onChooseFile} />
              {value.attachments.length ? (
                <Stack gap="sm">
                  {imageDrafts.map((row) => (
                    <Inline key={row.key} justify="space-between">
                      <AppText variant="caption">이미지 · {row.fileName}</AppText>
                      <Button label="삭제" size="sm" variant="ghost" onPress={() => onRemoveAttachment(row.key)} />
                    </Inline>
                  ))}
                  {fileDrafts.map((row) => (
                    <Inline key={row.key} justify="space-between">
                      <AppText variant="caption">파일 · {row.fileName}</AppText>
                      <Button label="삭제" size="sm" variant="ghost" onPress={() => onRemoveAttachment(row.key)} />
                    </Inline>
                  ))}
                </Stack>
              ) : (
                <AppText variant="caption" color="textSecondary">첨부된 파일이 없습니다.</AppText>
              )}
              {error ? <AppText color="danger">{error.message}</AppText> : null}
              <Button
                label="고객 앱 미리보기"
                variant="secondary"
                fullWidth
                disabled={!canPublish}
                onPress={onPreview}
              />
              <Button
                label={editing ? '수정하기' : '게시하기'}
                fullWidth
                loading={busy}
                disabled={!canPublish}
                onPress={onSubmit}
              />
            </Stack>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

function NewsDetailModal({
  open,
  item,
  token,
  onClose,
}: {
  open: boolean;
  item: CustomerNewsItem | null;
  token: string | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [comment, setComment] = useState('');
  const contentWidth = Math.max(windowWidth - theme.spacing.lg * 2, 1);

  const comments = useQuery({
    queryKey: ['customer-news-comments', item?.id],
    queryFn: () => listNewsComments(token, item!.id),
    enabled: Boolean(token && item),
    retry: false,
  });

  const create = useMutation({
    mutationFn: () => createNewsComment(token, item!.id, comment),
    onSuccess: async () => {
      setComment('');
      await client.invalidateQueries({ queryKey: ['customer-news-comments', item?.id] });
    },
  });

  const galleryUrls = item
    ? buildCustomerNewsGalleryUrls({
        heroImageUrl: item.heroImageUrl,
        attachments: item.attachments,
      })
    : [];
  const fileRows = item ? fileDraftsFromDrafts(hydrateDraftAttachmentsFromItem(item)) : [];
  const content = String(item?.content ?? '').trim();

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <AppText variant="heading">소식지 상세</AppText>
          <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {item ? (
            <>
              <Stack gap="md" style={styles.detailBody}>
                <Inline wrap>
                  {item.isPinned ? <Badge label="고정" tone="warning" /> : null}
                  <Badge label={newsScopeLabel(item.scope, item.targetCustomerName)} tone="info" />
                </Inline>
                {galleryUrls.length ? (
                  <CustomerNewsImageCarousel imageUrls={galleryUrls} contentWidth={contentWidth} />
                ) : null}
                {content ? <AppText>{content}</AppText> : null}
                {fileRows.map((file) => (
                  <Button
                    key={file.key}
                    label={`첨부 열기 · ${file.fileName}`}
                    variant="secondary"
                    onPress={() => void Linking.openURL(String(file.url ?? ''))}
                  />
                ))}
              </Stack>
              <AppText variant="heading">댓글</AppText>
              {comments.isLoading ? <AppText variant="caption">댓글을 불러오는 중…</AppText> : null}
              {comments.isError ? (
                <Card variant="outlined">
                  <AppText color="textSecondary">댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</AppText>
                </Card>
              ) : null}
              {comments.data?.map((row) => (
                <Card key={row.id} variant="filled">
                  <AppText variant="bodyStrong">
                    {row.authorName} · {row.authorType === 'customer' ? '고객' : '담당자'}
                  </AppText>
                  <AppText>{row.content}</AppText>
                </Card>
              ))}
              {!comments.isLoading && !comments.isError && !comments.data?.length ? (
                <Card variant="outlined">
                  <AppText color="textSecondary" align="center">등록된 댓글이 없습니다.</AppText>
                </Card>
              ) : null}
              <Card variant="outlined">
                <Stack gap="sm">
                  <TextField label="댓글 작성" value={comment} onChangeText={setComment} multiline />
                  <Button
                    label="댓글 등록"
                    loading={create.isPending}
                    disabled={!comment.trim() || comments.isError}
                    onPress={() => create.mutate()}
                  />
                  {create.isError ? (
                    <AppText color="danger">
                      {create.error instanceof Error ? create.error.message : '댓글 등록에 실패했습니다.'}
                    </AppText>
                  ) : null}
                </Stack>
              </Card>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    grow: { flex: 1 },
    listHeader: { gap: theme.spacing.md },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.md },
    detailBody: { width: '100%' },
    modal: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: {
      minHeight: 64,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  });
}
