import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { CoverageCustomerBar } from './CoverageCustomerBar';
import {
  CoveragePrimaryButton,
  CoverageSimulatorHeader,
  CoverageSimulatorScreen,
} from './CoverageSimulatorChrome';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import {
  coverageScenarioEditorPath,
  COVERAGE_SIMULATION_HOME,
} from './coverageSimulatorNavigation';
import {
  getConsultation,
  listConsultationsByTemplateId,
  saveConsultation,
} from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { createSimulationFromScenario } from './scenarioEdits';
import { SavedScenarioCrudPanel } from './SavedScenarioCrudPanel';
import { simulatorTheme as theme } from './simulatorTheme';

type Props = {
  templateId: string;
};

export function CoverageTemplateSimulationListScreen({ templateId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const customer = useCoverageCustomer();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const templateQuery = useQuery({
    queryKey: [...coverageQueryKey(userId), 'template', templateId],
    queryFn: () => getConsultation(consultationStorage, userId, templateId),
    enabled: Boolean(userId && templateId),
  });

  const listQuery = useQuery({
    queryKey: [...coverageQueryKey(userId), 'template-sims', templateId, customer.id],
    queryFn: () =>
      listConsultationsByTemplateId(consultationStorage, userId, templateId, customer.id),
    enabled: Boolean(userId && templateId),
  });

  const template = templateQuery.data;
  const title = template?.title ?? '시나리오';

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
    await listQuery.refetch();
  };

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  if (!templateId) {
    return (
      <CoverageSimulatorScreen>
        <CoverageSimulatorHeader title="보장 시뮬레이션" onBack={() => router.replace(COVERAGE_SIMULATION_HOME as never)} />
        <Text style={styles.muted}>시나리오를 찾을 수 없습니다.</Text>
      </CoverageSimulatorScreen>
    );
  }

  if (templateQuery.isSuccess && !template) {
    return (
      <CoverageSimulatorScreen>
        <CoverageSimulatorHeader title="보장 시뮬레이션" onBack={() => router.replace(COVERAGE_SIMULATION_HOME as never)} />
        <Text style={styles.muted}>시나리오를 찾을 수 없습니다.</Text>
      </CoverageSimulatorScreen>
    );
  }

  async function createNewSimulation() {
    if (!template || !userId) return;
    setBusy(true);
    setNotice('');
    try {
      const simulation = createSimulationFromScenario(template, {
        id: customer.id,
        name: customer.name,
      });
      const saved = await saveConsultation(consultationStorage, userId, simulation);
      await refresh();
      router.push(coverageScenarioEditorPath(saved.id) as never);
    } catch {
      setNotice('시뮬레이션을 만들지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title={title} onBack={() => router.replace(COVERAGE_SIMULATION_HOME as never)} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CoverageCustomerBar />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <CoveragePrimaryButton label="+ 새 시뮬레이션 만들기" disabled={busy || !template} onPress={() => void createNewSimulation()} />
        <Text style={styles.heading}>저장된 시뮬레이션</Text>
        <SavedScenarioCrudPanel
          rows={rows}
          emptyLabel="저장된 시뮬레이션이 없습니다."
          onRefresh={refresh}
        />
      </ScrollView>
    </CoverageSimulatorScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
  heading: { fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 8 },
  muted: { color: theme.muted, fontSize: 13, padding: 16 },
  notice: { color: theme.primary, fontSize: 13 },
});
