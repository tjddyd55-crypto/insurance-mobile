import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { AppText, Badge, Button, Card, Divider, Inline, Screen, Stack, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { createCustomerNews, createNewsComment, deleteCustomerNews, listCustomerNews, listLinkedCustomers, listNewsComments, updateCustomerNews, uploadNewsAttachment } from './customerNewsApi';
import { attachmentKind, newsScopeLabel, validateNewsAttachment } from './customerNewsModel';
import type { CustomerNewsItem, LinkedCustomer, LocalAttachment } from './types';

type FormState = { title: string; content: string; sendPush: boolean; pinned: boolean; asset: LocalAttachment | null };
const EMPTY_FORM: FormState = { title: '', content: '', sendPush: true, pinned: false, asset: null };
type ConfirmState = { type: 'publish' } | { type: 'delete'; item: CustomerNewsItem } | null;

export function CustomerNewsScreen() {
  const { token } = useAuth();
  const client = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [scope, setScope] = useState<'all' | 'personal'>('all');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerNewsItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selected, setSelected] = useState<CustomerNewsItem | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [notice, setNotice] = useState('');
  const linked = useQuery({ queryKey: ['customer-news', 'linked-customers'], queryFn: () => listLinkedCustomers(token), enabled: Boolean(token) });
  useEffect(() => { if (!customerId && linked.data?.[0]) setCustomerId(linked.data[0].customerId); }, [customerId, linked.data]);
  const listKey = ['customer-news', scope, scope === 'personal' ? customerId : null] as const;
  const news = useQuery({ queryKey: listKey, queryFn: () => listCustomerNews(token, scope, scope === 'personal' ? customerId : null), enabled: Boolean(token && (scope === 'all' || customerId)) });
  const rows = (news.data ?? []).filter((item) => !search.trim() || `${item.title} ${item.content} ${item.targetCustomerName}`.toLowerCase().includes(search.trim().toLowerCase()));
  const publish = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.content.trim()) throw new Error('제목과 내용을 입력해 주세요.');
      if (scope === 'personal' && !customerId) throw new Error('받을 고객을 선택해 주세요.');
      const attachments = form.asset ? [await uploadNewsAttachment(token, form.asset, scope === 'personal' ? customerId : null)] : editing?.attachments?.map(({ id: _id, ...item }) => item);
      if (editing) await updateCustomerNews(token, editing.id, { title: form.title.trim(), content: form.content.trim(), sendPush: form.sendPush, attachments });
      else await createCustomerNews(token, { title: form.title.trim(), content: form.content.trim(), scope, targetCustomerId: scope === 'personal' ? customerId : null, sendPush: form.sendPush, isPinned: form.pinned, attachments });
    },
    onSuccess: async () => { setConfirm(null); setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setNotice(form.sendPush ? '소식지를 게시하고 고객 앱 알림을 요청했습니다.' : '소식지를 게시했습니다.'); await client.invalidateQueries({ queryKey: ['customer-news'] }); },
  });
  const remove = useMutation({ mutationFn: (item: CustomerNewsItem) => deleteCustomerNews(token, item), onSuccess: async () => { setConfirm(null); setSelected(null); setNotice('소식지를 삭제했습니다.'); await client.invalidateQueries({ queryKey: ['customer-news'] }); } });
  function openCreate() { setEditing(null); setForm({ ...EMPTY_FORM, title: scope === 'personal' ? `${linked.data?.find((item) => item.customerId === customerId)?.customerName ?? '고객'} 고객님께` : '' }); setFormOpen(true); }
  function openEdit(item: CustomerNewsItem) { setEditing(item); setForm({ title: item.title, content: item.content, sendPush: false, pinned: item.isPinned, asset: null }); setFormOpen(true); }
  async function chooseFile() { const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], multiple: false, copyToCacheDirectory: true }); if (result.canceled) return; const asset = result.assets[0]; if (!asset) return; const local: LocalAttachment = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size, kind: attachmentKind(asset.mimeType ?? '') }; const error = validateNewsAttachment(local); if (error) { setNotice(error); return; } setForm((value) => ({ ...value, asset: local })); }
  const audience = linked.data?.find((item) => item.customerId === customerId);
  return (
    <View style={styles.root}>
      <AppHeader title="고객소식지" />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={news.isRefetching} onRefresh={() => void news.refetch()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}>
          <Card>
            <Stack gap="md">
              <AppText variant="heading">고객 앱 소식지</AppText>
              <AppText variant="caption">전체 공지와 연결 고객 개인메시지를 게시하고 고객 댓글을 확인합니다.</AppText>
              <Inline><Button label="전체소식지" style={styles.grow} variant={scope === 'all' ? 'primary' : 'secondary'} onPress={() => setScope('all')} /><Button label="개인메시지" style={styles.grow} variant={scope === 'personal' ? 'primary' : 'secondary'} onPress={() => setScope('personal')} /></Inline>
              {scope === 'personal' ? <LinkedCustomerPicker rows={linked.data ?? []} selectedId={customerId} onSelect={setCustomerId} /> : null}
              <Inline align="flex-end"><TextField label="검색" placeholder="제목 · 내용 검색" value={search} onChangeText={setSearch} containerStyle={styles.grow} /><Button label="+ 작성" onPress={openCreate} disabled={scope === 'personal' && !customerId} /></Inline>
            </Stack>
          </Card>
          {notice ? <Card variant="filled"><AppText color="success">{notice}</AppText></Card> : null}
          {news.isError || linked.isError ? <ErrorState title="고객소식지를 불러오지 못했습니다" message={(news.error ?? linked.error) instanceof Error ? ((news.error ?? linked.error)?.message ?? '잠시 후 다시 시도해 주세요.') : '잠시 후 다시 시도해 주세요.'} onRetry={() => void Promise.all([news.refetch(), linked.refetch()])} /> : null}
          <Inline wrap><Badge label={newsScopeLabel(scope, audience?.customerName)} tone="info" /><Badge label={`${rows.length}건`} /></Inline>
          {!news.isLoading && !rows.length ? <Card variant="outlined"><AppText color="textSecondary" align="center">게시된 소식지가 없습니다.</AppText></Card> : null}
          {rows.map((item) => <NewsCard key={item.id} item={item} onDetail={() => setSelected(item)} onEdit={() => openEdit(item)} onDelete={() => setConfirm({ type: 'delete', item })} />)}
        </ScrollView>
      </Screen>
      <NewsFormModal open={formOpen} scope={scope} audience={audience} editing={editing} value={form} setValue={setForm} busy={publish.isPending} error={publish.error} onChooseFile={() => void chooseFile()} onClose={() => setFormOpen(false)} onSubmit={() => setConfirm({ type: 'publish' })} />
      <NewsDetailModal open={Boolean(selected)} item={selected} token={token} onClose={() => setSelected(null)} />
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.type === 'delete' ? '소식지 삭제' : form.sendPush ? '게시 및 앱 알림' : '소식지 게시'} message={confirm?.type === 'delete' ? '삭제하면 고객 앱에서도 보이지 않으며 복구할 수 없습니다.' : form.sendPush ? '소식지를 게시하고 고객 앱 알림을 전송하시겠습니까?' : '고객 앱에 소식지를 게시하시겠습니까?'} confirmLabel={confirm?.type === 'delete' ? '삭제' : '게시'} tone={confirm?.type === 'delete' ? 'danger' : 'default'} busy={publish.isPending || remove.isPending} onCancel={() => setConfirm(null)} onConfirm={() => confirm?.type === 'delete' ? remove.mutateAsync(confirm.item) : publish.mutateAsync()} />
    </View>
  );
}

function LinkedCustomerPicker({ rows, selectedId, onSelect }: { rows: LinkedCustomer[]; selectedId: number | null; onSelect: (id: number) => void }) { return <View><AppText variant="label">받을 고객</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>{rows.map((item) => <Button key={item.customerId} label={`${item.customerName} · 기기 ${item.deviceCount}`} size="sm" variant={selectedId === item.customerId ? 'primary' : 'secondary'} onPress={() => onSelect(item.customerId)} />)}</ScrollView>{!rows.length ? <AppText variant="caption">고객 앱에 연결된 고객이 없습니다.</AppText> : null}</View>; }
function NewsCard({ item, onDetail, onEdit, onDelete }: { item: CustomerNewsItem; onDetail: () => void; onEdit: () => void; onDelete: () => void }) { return <Card variant="outlined"><Stack gap="sm"><Inline justify="space-between"><View style={{ flex: 1 }}><Inline wrap>{item.isPinned ? <Badge label="고정" tone="warning" /> : null}<Badge label={newsScopeLabel(item.scope, item.targetCustomerName)} tone="info" /></Inline><AppText variant="bodyStrong">{item.title}</AppText></View></Inline><AppText numberOfLines={3}>{item.content}</AppText><AppText variant="caption">{item.updatedAt ? new Date(item.updatedAt).toLocaleString('ko-KR') : '작성일 미확인'} · 첨부 {item.attachments?.length ?? 0}개</AppText><Inline wrap><Button label="상세·댓글" size="sm" onPress={onDetail} /><Button label="수정" size="sm" variant="secondary" onPress={onEdit} /><Button label="삭제" size="sm" variant="danger" onPress={onDelete} /></Inline></Stack></Card>; }

function NewsFormModal({ open, scope, audience, editing, value, setValue, busy, error, onChooseFile, onClose, onSubmit }: { open: boolean; scope: 'all' | 'personal'; audience?: LinkedCustomer; editing: CustomerNewsItem | null; value: FormState; setValue: React.Dispatch<React.SetStateAction<FormState>>; busy: boolean; error: Error | null; onChooseFile: () => void; onClose: () => void; onSubmit: () => void }) { const theme = useAppTheme(); const styles = useMemo(() => makeStyles(theme), [theme]); return <Modal visible={open} animationType="slide" onRequestClose={onClose}><View style={styles.modal}><View style={styles.modalHeader}><AppText variant="heading">{editing ? '소식지 수정' : '소식지 작성'}</AppText><Button label="닫기" size="sm" variant="ghost" onPress={onClose} /></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Card variant="outlined"><Stack gap="md"><Badge label={newsScopeLabel(scope, audience?.customerName)} tone="info" /><TextField label="제목" required value={value.title} onChangeText={(title) => setValue((old) => ({ ...old, title }))} /><TextField label="내용" required value={value.content} onChangeText={(content) => setValue((old) => ({ ...old, content }))} multiline numberOfLines={10} /><Inline wrap><Button label={value.sendPush ? '앱 알림 포함' : '알림 없이 게시'} size="sm" variant={value.sendPush ? 'primary' : 'secondary'} onPress={() => setValue((old) => ({ ...old, sendPush: !old.sendPush }))} /><Button label={value.pinned ? '상단 고정' : '일반 게시'} size="sm" variant={value.pinned ? 'primary' : 'secondary'} disabled={Boolean(editing)} onPress={() => setValue((old) => ({ ...old, pinned: !old.pinned }))} /><Button label="이미지/PDF 첨부" size="sm" variant="secondary" onPress={onChooseFile} /></Inline>{value.asset ? <AppText variant="caption">첨부: {value.asset.name}</AppText> : editing?.attachments?.length ? <AppText variant="caption">기존 첨부 {editing.attachments.length}개 유지</AppText> : null}{error ? <AppText color="danger">{error.message}</AppText> : null}<Button label={editing ? '수정 내용 확인' : '게시 내용 확인'} fullWidth loading={busy} disabled={!value.title.trim() || !value.content.trim()} onPress={onSubmit} /></Stack></Card></ScrollView></View></Modal>; }

function NewsDetailModal({ open, item, token, onClose }: { open: boolean; item: CustomerNewsItem | null; token: string | null; onClose: () => void }) { const client = useQueryClient(); const theme = useAppTheme(); const styles = useMemo(() => makeStyles(theme), [theme]); const [comment, setComment] = useState(''); const comments = useQuery({ queryKey: ['customer-news-comments', item?.id], queryFn: () => listNewsComments(token, item!.id), enabled: Boolean(token && item) }); const create = useMutation({ mutationFn: () => createNewsComment(token, item!.id, comment), onSuccess: async () => { setComment(''); await client.invalidateQueries({ queryKey: ['customer-news-comments', item?.id] }); } }); return <Modal visible={open} animationType="slide" onRequestClose={onClose}><View style={styles.modal}><View style={styles.modalHeader}><AppText variant="heading">소식지 상세</AppText><Button label="닫기" size="sm" variant="ghost" onPress={onClose} /></View><ScrollView contentContainerStyle={styles.content}>{item ? <><Card><Stack gap="md"><Inline wrap>{item.isPinned ? <Badge label="고정" tone="warning" /> : null}<Badge label={newsScopeLabel(item.scope, item.targetCustomerName)} tone="info" /></Inline><AppText variant="title">{item.title}</AppText><Divider /><AppText>{item.content}</AppText>{item.attachments?.map((file) => <Button key={file.id ?? file.url} label={`첨부 열기 · ${file.fileName}`} variant="secondary" onPress={() => void Linking.openURL(file.url)} />)}</Stack></Card><AppText variant="heading">댓글</AppText>{comments.data?.map((row) => <Card key={row.id} variant="filled"><AppText variant="bodyStrong">{row.authorName} · {row.authorType === 'customer' ? '고객' : '담당자'}</AppText><AppText>{row.content}</AppText></Card>)}<Card variant="outlined"><Stack gap="sm"><TextField label="댓글 작성" value={comment} onChangeText={setComment} multiline /><Button label="댓글 등록" loading={create.isPending} disabled={!comment.trim()} onPress={() => create.mutate()} /></Stack></Card></> : null}</ScrollView></View></Modal>; }
function makeStyles(theme: AppTheme) { return StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, grow: { flex: 1 }, content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.md }, modal: { flex: 1, backgroundColor: theme.colors.background }, modalHeader: { minHeight: 64, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface } }); }
