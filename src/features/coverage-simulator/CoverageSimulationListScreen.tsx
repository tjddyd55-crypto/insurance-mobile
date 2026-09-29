import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, ModalShell, TextField } from '../../design-system';
import { CoverageCustomerBar } from './CoverageCustomerBar';
import { CoveragePrimaryButton, CoverageSimulatorHeader, CoverageSimulatorScreen } from './CoverageSimulatorChrome';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { deleteConsultation, listConsultationSummaries, renameConsultation, saveConsultation } from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { formatConsultationListDate } from './coverageAnalysis';
import {
  customerDisplayLabel,
  filterSavedByCustomer,
  filterSavedByDisease,
  type ConsultationCustomerFilter,
} from './scenarioEdits';
import { simulatorTheme as theme } from './simulatorTheme';
import { createScenarioFromTemplate, diseaseTypeTitle, isKnownDiseaseType } from './templates';
import type { DiseaseType, SavedScenarioSummary } from './types';

export function coverageQueryKey(userId: string) {
  return ['coverage-consultations', userId] as const;
}

const CUSTOMER_FILTERS: { id: ConsultationCustomerFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'linked', label: '고객 연결' },
  { id: 'unassigned', label: '미지정' },
];

const DISEASE_FILTERS: { id: DiseaseType | 'all'; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'cancer', label: '암' },
  { id: 'cerebrovascular', label: '뇌혈관' },
  { id: 'heart', label: '심장' },
  { id: 'care-dementia', label: '간병' },
];

export function CoverageSimulationListScreen({ diseaseType }: { diseaseType: string }) {
  const known = isKnownDiseaseType(diseaseType);
  const router = useRouter();
  if (!known) {
    return (
      <CoverageSimulatorScreen>
        <CoverageSimulatorHeader title="보장 시뮬레이션" onBack={() => router.back()} />
        <Text style={styles.muted}>시나리오를 찾을 수 없습니다.</Text>
      </CoverageSimulatorScreen>
    );
  }
  return <DiseaseList diseaseType={diseaseType} onBack={() => router.back()} />;
}

function DiseaseList({ diseaseType, onBack }: { diseaseType: DiseaseType; onBack: () => void }) {
  const { user } = useAuth();
  const customer = useCoverageCustomer();
  const router = useRouter();
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
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title={diseaseTypeTitle(diseaseType)} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <CoverageCustomerBar />
        <Text style={styles.heading}>저장된 시뮬레이션</Text>
        {notice ? <Text style={styles.error}>{notice}</Text> : null}
        {!query.isLoading && !(query.data ?? []).length ? <Text style={styles.muted}>저장된 시뮬레이션이 없습니다.</Text> : null}
        {(query.data ?? []).map((row) => (
          <View key={row.id} style={styles.listCard}>
            <Pressable accessibilityRole="button" onPress={() => openScenario(row.id)} style={styles.listMain}>
              <Text style={styles.listTitle}>{row.title}</Text>
              <Text style={styles.meta}>작성 {formatConsultationListDate(row.createdAt)}</Text>
              <Text style={styles.meta}>수정 {formatConsultationListDate(row.updatedAt)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${row.title} 메뉴`} onPress={() => setMenuRow(row)} style={styles.more}>
              <Text style={styles.moreGlyph}>⋯</Text>
            </Pressable>
          </View>
        ))}
        <CoveragePrimaryButton label="+ 새 시뮬레이션 만들기" onPress={() => void createNew()} />
      </ScrollView>
      <ModalShell open={menuRow != null} title={menuRow?.title ?? ''} presentation="dialog" onRequestClose={() => setMenuRow(null)}>
        <View style={styles.menuStack}>
          <Button label="열기" onPress={() => { if (menuRow) openScenario(menuRow.id); setMenuRow(null); }} />
          <Button label="제목 수정" variant="secondary" onPress={() => { setRenameRow(menuRow); setRenameTitle(menuRow?.title ?? ''); setMenuRow(null); }} />
          <Button label="삭제" variant="danger" onPress={() => { setDeleteRow(menuRow); setMenuRow(null); }} />
        </View>
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
    </CoverageSimulatorScreen>
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
      setNotice('제목이 수정되었습니다.');
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
      setNotice('삭제되었습니다.');
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
  const [customerFilter, setCustomerFilter] = useState<ConsultationCustomerFilter>('all');
  const [diseaseFilter, setDiseaseFilter] = useState<DiseaseType | 'all'>('all');
  const query = useQuery({
    queryKey: coverageQueryKey(userId),
    queryFn: () => listConsultationSummaries(consultationStorage, userId),
    enabled: Boolean(userId),
  });
  const rows = useMemo(
    () => filterSavedByDisease(filterSavedByCustomer(query.data ?? [], customerFilter), diseaseFilter),
    [customerFilter, diseaseFilter, query.data],
  );

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title="저장된 상담" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <FilterRow options={CUSTOMER_FILTERS} selected={customerFilter} onSelect={setCustomerFilter} />
        <FilterRow options={DISEASE_FILTERS} selected={diseaseFilter} onSelect={setDiseaseFilter} />
        {!query.isLoading && !rows.length ? <Text style={styles.muted}>저장된 상담이 없습니다.</Text> : null}
        {rows.map((row) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            onPress={() => router.push(`/customer-consulting/coverage-simulation/scenarios/${row.id}` as never)}
            style={styles.savedRow}
          >
            <View style={styles.listMain}>
              <Text style={styles.listTitle}>{row.title}</Text>
              <Text style={styles.meta}>{customerDisplayLabel(row)}</Text>
              <Text style={styles.meta}>
                상담일 {row.consultationDate} · 수정 {new Date(row.updatedAt).toLocaleString('ko-KR')}
              </Text>
            </View>
            <Text style={styles.moreGlyph}>⋯</Text>
          </Pressable>
        ))}
      </ScrollView>
    </CoverageSimulatorScreen>
  );
}

function FilterRow<T extends string>({
  options, selected, onSelect,
}: {
  options: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {options.map((entry) => {
        const active = entry.id === selected;
        return (
          <Pressable key={entry.id} accessibilityRole="button" onPress={() => onSelect(entry.id)} style={[styles.filter, active && styles.filterActive]}>
            <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{entry.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  heading: { marginTop: 12, marginBottom: 8, fontSize: 14, fontWeight: '700', color: theme.muted },
  muted: { color: theme.muted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  error: { color: theme.danger, marginBottom: 8 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.surface,
  },
  listMain: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 6 },
  meta: { fontSize: 12, color: theme.muted, lineHeight: 17 },
  more: { width: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  moreGlyph: { fontSize: 20, color: theme.muted },
  menuStack: { gap: 8 },
  filters: { gap: 8, paddingBottom: 8 },
  filter: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterActive: { borderColor: theme.primaryBorder, backgroundColor: theme.primarySoft },
  filterLabel: { fontSize: 13, color: theme.text },
  filterLabelActive: { color: theme.primary, fontWeight: '700' },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#fff',
  },
});
