import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { Button, ModalShell, TextField } from '../../design-system';
import { CoverageCustomerBar } from './CoverageCustomerBar';
import { CoveragePrimaryButton, CoverageSimulatorHeader, CoverageSimulatorScreen } from './CoverageSimulatorChrome';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import {
  listConsultationSummaries,
  listScenarioLibrarySummaries,
  saveConsultation,
} from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { SavedScenarioCrudPanel } from './SavedScenarioCrudPanel';
import { ScenarioLibraryCrudPanel } from './ScenarioLibraryCrudPanel';
import { createUserScenario } from './scenarioEdits';
import { simulatorTheme as theme } from './simulatorTheme';

export function CoverageScenarioSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const scenarioQuery = useQuery({
    queryKey: [...coverageQueryKey(userId), 'scenario-library'],
    queryFn: () => listScenarioLibrarySummaries(consultationStorage, userId),
    enabled: Boolean(userId),
  });

  const simulationQuery = useQuery({
    queryKey: [...coverageQueryKey(userId), 'home-simulations'],
    queryFn: () => listConsultationSummaries(consultationStorage, userId),
    enabled: Boolean(userId),
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
    await Promise.all([scenarioQuery.refetch(), simulationQuery.refetch()]);
  };

  const submitAddScenario = async () => {
    const scenario = createUserScenario(newTitle);
    if (!scenario || !userId) return;
    setBusy(true);
    try {
      await saveConsultation(consultationStorage, userId, scenario);
      setAddOpen(false);
      setNewTitle('');
      await refreshAll();
      router.push(`/customer-consulting/coverage-simulation/scenarios/${scenario.id}` as never);
    } finally {
      setBusy(false);
    }
  };

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title="보장 시뮬레이션" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CoverageCustomerBar />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>시나리오</Text>
          <CoveragePrimaryButton label="+ 시나리오 추가" onPress={() => setAddOpen(true)} />
        </View>
        <ScenarioLibraryCrudPanel rows={scenarioQuery.data ?? []} onRefresh={refreshAll} />

        <Text style={[styles.sectionTitle, styles.simulationHeading]}>저장된 시뮬레이션</Text>
        <SavedScenarioCrudPanel
          rows={simulationQuery.data ?? []}
          emptyLabel="저장된 시뮬레이션이 없습니다."
          onRefresh={refreshAll}
        />

        <View style={styles.cta}>
          <CoveragePrimaryButton
            label="저장된 상담 전체 보기"
            onPress={() => router.push('/customer-consulting/coverage-simulation/saved' as never)}
          />
        </View>
      </ScrollView>

      <ModalShell
        open={addOpen}
        title="시나리오 추가"
        presentation="dialog"
        busy={busy}
        closeOnBackdrop={false}
        onRequestClose={() => setAddOpen(false)}
        footer={
          <Button
            label="만들기"
            loading={busy}
            disabled={!newTitle.trim()}
            onPress={() => void submitAddScenario()}
          />
        }
      >
        <TextField
          accessibilityLabel="시나리오 제목"
          placeholder="예: 갑상선암 치료"
          value={newTitle}
          onChangeText={setNewTitle}
          error={!newTitle.trim() ? '제목을 입력해 주세요.' : undefined}
        />
      </ModalShell>
    </CoverageSimulatorScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  sectionHeader: { marginTop: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  simulationHeading: { marginTop: 20, marginBottom: 8 },
  cta: { marginTop: 16 },
});
