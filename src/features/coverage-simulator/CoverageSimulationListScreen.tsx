import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
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
import { CoverageCustomerBar } from './CoverageCustomerBar';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { deleteConsultation, listConsultationSummaries, renameConsultation, saveConsultation } from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { formatConsultationListDate } from './coverageAnalysis';
import { createScenarioFromTemplate, diseaseTypeTitle, isKnownDiseaseType } from './templates';
import type { DiseaseType, SavedScenarioSummary } from './types';

export function coverageQueryKey(userId: string) {
  return ['coverage-consultations', userId] as const;
}

export function CoverageSimulationListScreen({ diseaseType }: { diseaseType: string }) {
  const known = isKnownDiseaseType(diseaseType);
  const router = useRouter();
  if (!known) {
    return (
      <View style={{ flex: 1 }}>
        <AppHeader title="보장 시뮬레이션" showBack showMenu={false} />
        <EmptyState title="시나리오를 찾을 수 없습니다." />
      </View>
    );
  }
  return <DiseaseList diseaseType={diseaseType} onBack={() => router.back()} />;
}

function DiseaseList({ diseaseType, onBack }: { diseaseType: DiseaseType; onBack: () => void }) {
  const { user } = useAuth();
  const customer = useCoverageCustomer();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...coverageQueryKey(userId), diseaseType, customer.id],
    queryFn: () => listConsultationSummaries(consultationStorage, userId, diseaseType, customer.id),
    enabled: Boolean(userId),
  });
  const [menuRow, setMenuRow] = useState<SavedScenarioSummary | null>(null);
  const [renameRow, setRenameRow] = useState<SavedScenarioSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteRow, setDeleteRow] = useState<SavedScenarioSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const openScenario = (id: string) => {
    router.push(`/customer-consulting/coverage-simulation/scenarios/${id}` as never);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
  };

  return (
    <View style={styles.root}>
      <AppHeader title={diseaseTypeTitle(diseaseType)} showBack showMenu={false} onBackPress={onBack} />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <CoverageCustomerBar />
          <AppText variant="heading">저장된 시뮬레이션</AppText>
          {notice ? <AppText color="danger">{notice}</AppText> : null}
          {query.isLoading ? <LoadingState message="시뮬레이션을 불러오는 중…" /> : null}
          {!query.isLoading && !(query.data ?? []).length ? (
            <EmptyState title="저장된 시뮬레이션이 없습니다." />
          ) : null}
          {(query.data ?? []).map((row) => (
            <Card key={row.id}>
              <Inline justify="space-between" align="flex-start">
                <Pressable style={styles.grow} onPress={() => openScenario(row.id)}>
                  <Stack gap="xs">
                    <AppText variant="bodyStrong">{row.title}</AppText>
                    <AppText variant="caption" color="textMuted">작성 {formatConsultationListDate(row.createdAt)}</AppText>
                    <AppText variant="caption" color="textMuted">수정 {formatConsultationListDate(row.updatedAt)}</AppText>
                    {row.customerNameSnapshot ? <AppText variant="caption">{row.customerNameSnapshot}</AppText> : null}
                  </Stack>
                </Pressable>
                <Button label="⋯" size="sm" variant="ghost" accessibilityLabel={`${row.title} 메뉴`} onPress={() => setMenuRow(row)} />
              </Inline>
            </Card>
          ))}
          <Button label="+ 새 시뮬레이션 만들기" onPress={() => void createNew()} />
        </ScrollView>
      </Screen>
      <ModalShell open={menuRow != null} title={menuRow?.title ?? ''} presentation="dialog" onRequestClose={() => setMenuRow(null)}>
        <Stack gap="sm">
          <Button label="열기" onPress={() => { if (menuRow) openScenario(menuRow.id); setMenuRow(null); }} />
          <Button label="제목 수정" variant="secondary" onPress={() => { setRenameRow(menuRow); setRenameTitle(menuRow?.title ?? ''); setMenuRow(null); }} />
          <Button label="삭제" variant="danger" onPress={() => { setDeleteRow(menuRow); setMenuRow(null); }} />
        </Stack>
      </ModalShell>
      <ModalShell
        open={renameRow != null}
        title="제목 수정"
        presentation="dialog"
        busy={busy}
        onRequestClose={() => setRenameRow(null)}
        footer={<Button label="저장" loading={busy} onPress={() => void submitRename()} />}
      >
        <TextField accessibilityLabel="시뮬레이션 제목" value={renameTitle} onChangeText={setRenameTitle} error={!renameTitle.trim() ? '제목을 입력해 주세요.' : undefined} />
      </ModalShell>
      <ConfirmDialog
        open={deleteRow != null}
        title="이 시뮬레이션을 삭제할까요?"
        message="저장된 보장 시뮬레이션이 삭제됩니다."
        confirmLabel="삭제"
        tone="danger"
        busy={busy}
        onCancel={() => setDeleteRow(null)}
        onConfirm={() => void submitDelete()}
      />
    </View>
  );

  async function createNew() {
    const scenario = createScenarioFromTemplate(diseaseType, { id: customer.id, name: customer.name });
    if (!scenario || !userId) return;
    setNotice('');
    try {
      const saved = await saveConsultation(consultationStorage, userId, scenario);
      await refresh();
      openScenario(saved.id);
    } catch {
      setNotice('시뮬레이션을 만들지 못했습니다.');
    }
  }

  async function submitRename() {
    if (!renameRow || !renameTitle.trim() || !userId) return;
    setBusy(true);
    try {
      const updated = await renameConsultation(consultationStorage, userId, renameRow.id, renameTitle);
      if (!updated) {
        setNotice('제목을 수정하지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      setRenameRow(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitDelete() {
    if (!deleteRow || !userId) return;
    setBusy(true);
    try {
      await deleteConsultation(consultationStorage, userId, deleteRow.id);
      setDeleteRow(null);
      await refresh();
    } catch {
      setNotice('삭제하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }
}

export function CoverageSavedScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const query = useQuery({
    queryKey: coverageQueryKey(userId),
    queryFn: () => listConsultationSummaries(consultationStorage, userId),
    enabled: Boolean(userId),
  });

  return (
    <View style={styles.root}>
      <AppHeader title="저장된 상담" showBack showMenu={false} />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          {query.isLoading ? <LoadingState message="저장된 상담을 불러오는 중…" /> : null}
          {!query.isLoading && !(query.data ?? []).length ? <EmptyState title="저장된 시뮬레이션이 없습니다." /> : null}
          {(query.data ?? []).map((row) => (
            <Pressable key={row.id} onPress={() => router.push(`/customer-consulting/coverage-simulation/scenarios/${row.id}` as never)}>
              <Card>
                <Stack gap="xs">
                  <AppText variant="bodyStrong">{row.title}</AppText>
                  <AppText variant="caption" color="textMuted">{diseaseTypeTitle(row.diseaseType)} · 수정 {formatConsultationListDate(row.updatedAt)}</AppText>
                </Stack>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      </Screen>
    </View>
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
