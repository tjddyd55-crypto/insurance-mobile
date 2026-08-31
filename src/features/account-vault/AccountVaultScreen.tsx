import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { AppText, Button, Card, Inline, Screen, Stack, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { createAccountVaultRow, deleteAccountVaultRow, getAccountVault, updateAccountVaultRow } from './accountVaultApi';
import { maskSecret } from './accountVaultModel';
import type { AccountCategory, AccountVaultRow } from './types';

const QUERY_KEY = ['account-vault'] as const;
const TABS: { id: AccountCategory; label: string }[] = [{ id: 'LIFE', label: '생명보험' }, { id: 'NON_LIFE', label: '손해보험' }, { id: 'GENERAL', label: '일반' }];

export function AccountVaultScreen() {
  const { token } = useAuth(); const queryClient = useQueryClient(); const theme = useAppTheme(); const styles = useMemo(() => createStyles(theme), [theme]);
  const [category, setCategory] = useState<AccountCategory>('LIFE'); const [addOpen, setAddOpen] = useState(false); const [deleting, setDeleting] = useState<AccountVaultRow | null>(null); const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => getAccountVault(token), enabled: Boolean(token) });
  const remove = useMutation({ mutationFn: (id: string) => deleteAccountVaultRow(token, id), onSuccess: async () => { setDeleting(null); await queryClient.invalidateQueries({ queryKey: QUERY_KEY }); } });
  const rows = (query.data ?? []).filter((row) => row.category === category && !row.isArchived).sort((a, b) => a.sortOrder - b.sortOrder);
  async function copy(value: string, label: string) { await Clipboard.setStringAsync(value); setMessage(`${label}를 복사했습니다.`); }
  return <View style={styles.root}><AppHeader title="계정관리" /><Screen padded={false}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><AppText variant="caption">보험사 로그인 정보는 서버에서 조회하며 기기에 별도로 저장하지 않습니다.</AppText><Inline>{TABS.map((tab) => <Button key={tab.id} label={tab.label} size="sm" variant={category === tab.id ? 'primary' : 'secondary'} style={styles.tab} onPress={() => setCategory(tab.id)} />)}</Inline><Inline justify="space-between"><AppText variant="heading">{TABS.find((tab) => tab.id === category)?.label} 계정</AppText><Button label="+ 계정 추가" size="sm" onPress={() => setAddOpen(true)} /></Inline>{message ? <AppText color="success">{message}</AppText> : null}{query.isError ? <ErrorState title="계정 정보를 불러오지 못했습니다" message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void query.refetch()} /> : null}{!query.isLoading && !query.isError && !rows.length ? <Card variant="outlined"><AppText color="textSecondary" align="center">등록된 계정 정보가 없습니다.</AppText></Card> : null}{rows.map((row) => <AccountCard key={row.id} row={row} token={token} onCopy={(value, label) => void copy(value, label)} onDelete={() => setDeleting(row)} styles={styles} />)}</ScrollView></Screen><AddAccountModal open={addOpen} category={category} token={token} onClose={() => setAddOpen(false)} /><ConfirmDialog open={Boolean(deleting)} title="계정 삭제" message={`${deleting?.companyName ?? ''} 계정을 삭제하시겠습니까?`} confirmLabel="삭제" tone="danger" busy={remove.isPending} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) remove.mutate(deleting.id); }} /></View>;
}

function AccountCard({ row, token, onCopy, onDelete, styles }: { row: AccountVaultRow; token: string | null; onCopy: (value: string, label: string) => void; onDelete: () => void; styles: ReturnType<typeof createStyles> }) {
  const queryClient = useQueryClient(); const [loginId, setLoginId] = useState(row.loginId); const [password, setPassword] = useState(row.loginPassword); const [revealed, setRevealed] = useState(false);
  useEffect(() => { setLoginId(row.loginId); setPassword(row.loginPassword); }, [row.loginId, row.loginPassword]);
  const save = useMutation({ mutationFn: () => updateAccountVaultRow(token, row.id, { loginId, loginPassword: password }), onSuccess: async () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }) });
  return <Card variant="outlined"><Stack gap="md"><AppText variant="heading">{row.companyName}</AppText><TextField label="아이디" value={loginId} onChangeText={setLoginId} autoCapitalize="none" autoCorrect={false} /><Inline justify="flex-end"><Button label="아이디 복사" size="sm" variant="ghost" disabled={!loginId} onPress={() => onCopy(loginId, '아이디')} /></Inline><TextField label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry={!revealed} autoCapitalize="none" autoCorrect={false} /><Inline wrap justify="flex-end"><Button label={revealed ? '숨기기' : `보기 (${maskSecret(password)})`} size="sm" variant="ghost" onPress={() => setRevealed((value) => !value)} /><Button label="비밀번호 복사" size="sm" variant="ghost" disabled={!password} onPress={() => onCopy(password, '비밀번호')} /></Inline>{save.error ? <AppText color="danger">{save.error instanceof Error ? save.error.message : '저장하지 못했습니다.'}</AppText> : null}<Inline><Button label="저장" loading={save.isPending} onPress={() => save.mutate()} style={styles.tab} />{row.isCustom ? <Button label="삭제" variant="danger" onPress={onDelete} style={styles.tab} /> : null}</Inline></Stack></Card>;
}

function AddAccountModal({ open, category, token, onClose }: { open: boolean; category: AccountCategory; token: string | null; onClose: () => void }) {
  const queryClient = useQueryClient(); const theme = useAppTheme(); const styles = useMemo(() => createStyles(theme), [theme]); const [companyName, setCompanyName] = useState(''); const [loginId, setLoginId] = useState(''); const [password, setPassword] = useState('');
  useEffect(() => { if (open) { setCompanyName(''); setLoginId(''); setPassword(''); } }, [open]);
  const create = useMutation({ mutationFn: () => createAccountVaultRow(token, { category, companyName: companyName.trim(), loginId: loginId.trim(), loginPassword: password }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: QUERY_KEY }); onClose(); } });
  return <Modal visible={open} animationType="slide" onRequestClose={onClose}><View style={styles.modal}><View style={styles.modalHeader}><AppText variant="heading">계정 추가</AppText><Button label="닫기" variant="ghost" size="sm" onPress={onClose} /></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Card variant="outlined"><Stack gap="md"><TextField label="회사명" required value={companyName} onChangeText={setCompanyName} /><TextField label="아이디" value={loginId} onChangeText={setLoginId} autoCapitalize="none" /><TextField label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />{create.error ? <AppText color="danger">{create.error instanceof Error ? create.error.message : '추가하지 못했습니다.'}</AppText> : null}<Button label="추가" fullWidth loading={create.isPending} disabled={!companyName.trim()} onPress={() => create.mutate()} /></Stack></Card></ScrollView></View></Modal>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({ root: { flex: 1 }, content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md }, tab: { flex: 1 }, modal: { flex: 1, backgroundColor: theme.colors.background }, modalHeader: { minHeight: 64, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface } }); }
