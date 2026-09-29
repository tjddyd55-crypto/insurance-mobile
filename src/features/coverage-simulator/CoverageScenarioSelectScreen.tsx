import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { CoverageCustomerBar } from './CoverageCustomerBar';
import { CoveragePrimaryButton, CoverageSimulatorHeader, CoverageSimulatorScreen } from './CoverageSimulatorChrome';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import { listConsultationSummaries, saveConsultation } from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { SavedScenarioCrudPanel } from './SavedScenarioCrudPanel';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { createScenarioFromTemplate, SCENARIO_TYPE_CARDS } from './templates';
import { simulatorTheme as theme } from './simulatorTheme';

export function CoverageScenarioSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const customer = useCoverageCustomer();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const savedQuery = useQuery({
    queryKey: [...coverageQueryKey(userId), 'home-saved', customer.id],
    queryFn: () => listConsultationSummaries(consultationStorage, userId, undefined, customer.id || undefined),
    enabled: Boolean(userId),
  });

  const refreshSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
    await savedQuery.refetch();
  };

  const addUserScenario = async () => {
    const scenario = createScenarioFromTemplate('custom', {
      id: customer.id,
      name: customer.name,
    });
    if (!scenario || !userId) return;
    const saved = await saveConsultation(consultationStorage, userId, scenario);
    await refreshSaved();
    router.push(`/customer-consulting/coverage-simulation/scenarios/${saved.id}` as never);
  };

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title="보장 시뮬레이션" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CoverageCustomerBar />

        <Text style={styles.sectionTitle}>시스템 시나리오</Text>
        <Text style={styles.sectionHint}>질병 유형별 템플릿으로 새 시뮬레이션을 만들거나 저장 목록을 엽니다.</Text>
        {SCENARIO_TYPE_CARDS.map((card) => (
          <Pressable
            key={card.diseaseType}
            accessibilityRole="button"
            onPress={() => router.push(`/customer-consulting/coverage-simulation/disease/${card.diseaseType}` as never)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.description}</Text>
          </Pressable>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 시뮬레이션</Text>
          <CoveragePrimaryButton label="+ 시나리오 추가" onPress={() => void addUserScenario()} />
        </View>
        <SavedScenarioCrudPanel
          rows={savedQuery.data ?? []}
          onRefresh={refreshSaved}
        />

        <View style={styles.cta}>
          <CoveragePrimaryButton
            label="저장된 상담 전체 보기"
            onPress={() => router.push('/customer-consulting/coverage-simulation/saved' as never)}
          />
        </View>
      </ScrollView>
    </CoverageSimulatorScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  sectionTitle: { marginTop: 8, marginBottom: 4, fontSize: 15, fontWeight: '700', color: theme.text },
  sectionHint: { fontSize: 13, color: theme.muted, lineHeight: 19, marginBottom: 12 },
  sectionHeader: { marginTop: 20, marginBottom: 8, gap: 8 },
  card: {
    width: '100%',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: theme.muted, lineHeight: 19 },
  cta: { marginTop: 16 },
});
