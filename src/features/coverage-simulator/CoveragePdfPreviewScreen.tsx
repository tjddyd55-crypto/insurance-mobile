import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import { CoveragePrimaryButton, CoverageSecondaryButton, CoverageSimulatorHeader, CoverageSimulatorScreen } from './CoverageSimulatorChrome';
import { CoverageTimeline } from './CoverageTimeline';
import { getConsultation } from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { calculateScenarioPeriodTotals, calculateScenarioTotals, sortItems } from './coverageAnalysis';
import { simulatorTheme as theme } from './simulatorTheme';
import { diseaseTypeTitle } from './templates';

const DISCLAIMER = [
  '본 자료는 상담 시 입력된 보장내용을 기준으로 작성된 비교자료입니다.',
  '실제 보험금 지급 여부 및 금액은 약관, 가입조건 및 사고내용에 따라 달라질 수 있습니다.',
];

export function CoveragePdfPreviewScreen({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const query = useQuery({
    queryKey: [...coverageQueryKey(userId), scenarioId],
    queryFn: () => getConsultation(consultationStorage, userId, scenarioId),
    enabled: Boolean(userId && scenarioId),
  });
  const [notice, setNotice] = useState('');
  const scenario = query.data;

  if (!scenario) {
    return (
      <CoverageSimulatorScreen>
        <CoverageSimulatorHeader title="PDF 미리보기" onBack={() => router.back()} />
        <Text style={styles.muted}>{query.isLoading ? '시나리오를 준비하는 중…' : '저장된 시나리오를 찾을 수 없습니다.'}</Text>
      </CoverageSimulatorScreen>
    );
  }

  const customerName = scenario.customerNameSnapshot ?? scenario.customerName;
  const date = scenario.consultationDate.slice(0, 10).split('-').join('.');

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title="PDF 미리보기" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.docTitle}>보장 시뮬레이션</Text>
        <Text style={styles.subtitle}>{diseaseTypeTitle(scenario.diseaseType)} — {scenario.title}</Text>
        <View style={styles.meta}>
          {customerName ? <Text style={styles.metaText}>고객: {customerName}</Text> : null}
          <Text style={styles.metaText}>작성일 {date}</Text>
        </View>
        <CoverageTimeline
          items={sortItems(scenario.items)}
          periods={calculateScenarioPeriodTotals(scenario.items)}
          totals={calculateScenarioTotals(scenario)}
          menuItemId={null}
          onToggleMenu={() => undefined}
          onEdit={() => undefined}
          onRemove={() => undefined}
          onAddAfter={() => undefined}
          readOnly
        />
        <View style={styles.disclaimer}>
          {DISCLAIMER.map((line) => <Text key={line} style={styles.disclaimerText}>{line}</Text>)}
          <Text style={styles.service}>ONE FC 보장 시뮬레이션 · 상담 참고용</Text>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.bottomBtn}>
          <CoverageSecondaryButton label="PDF 저장" onPress={() => setNotice('이 기기에서는 PDF 파일을 아직 만들지 않습니다. 미리보기에서 내용을 확인해 주세요.')} />
        </View>
        <View style={styles.bottomBtn}>
          <CoveragePrimaryButton label="닫기" onPress={() => router.back()} />
        </View>
      </View>
    </CoverageSimulatorScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  docTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 14, color: theme.muted },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaText: { fontSize: 12, color: theme.muted },
  disclaimer: { gap: 6, marginTop: 8 },
  disclaimerText: { fontSize: 12, lineHeight: 18, color: theme.muted },
  service: { fontSize: 12, fontWeight: '700', color: theme.text, marginTop: 4 },
  muted: { padding: 16, color: theme.muted },
  notice: { color: theme.danger, fontSize: 13 },
  bottom: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  bottomBtn: { flex: 1 },
});
