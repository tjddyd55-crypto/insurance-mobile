import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import { CoverageItemForm } from './CoverageItemForm';
import { CoveragePrimaryButton, CoverageSecondaryButton, CoverageSimulatorHeader, CoverageSimulatorScreen } from './CoverageSimulatorChrome';
import { CoverageTimeline } from './CoverageTimeline';
import { getConsultation, saveConsultation } from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { calculateScenarioPeriodTotals, calculateScenarioTotals, sortItems } from './coverageAnalysis';
import {
  insertCoverageItem,
  insertTimeMarker,
  removeScenarioItem,
  resetScenarioItems,
  updateCoverageItem,
} from './scenarioEdits';
import { simulatorTheme as theme } from './simulatorTheme';
import type { CoverageScenario, CoverageScenarioItem } from './types';

const BLURB: Partial<Record<CoverageScenario['diseaseType'], string>> = {
  cancer: '암 치료 과정에 따라 현재 보장과 제안 보장을 비교합니다.',
};

type FormState =
  | { type: 'add'; afterOrder: number }
  | { type: 'edit'; item: CoverageScenarioItem }
  | null;

export function CoverageSimulationScreen({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...coverageQueryKey(userId), scenarioId],
    queryFn: () => getConsultation(consultationStorage, userId, scenarioId),
    enabled: Boolean(userId && scenarioId),
  });
  const [form, setForm] = useState<FormState>(null);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const scenario = query.data;
  const persist = async (next: CoverageScenario, message = '') => {
    try {
      await saveConsultation(consultationStorage, userId, next);
      await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
      if (message) showToast(message);
    } catch {
      showToast('보장 분석을 저장하지 못했습니다.');
    }
  };

  if (query.isLoading) {
    return <CoverageSimulatorScreen><Text style={styles.status}>시나리오를 준비하는 중…</Text></CoverageSimulatorScreen>;
  }
  if (!scenario) {
    return (
      <CoverageSimulatorScreen>
        <CoverageSimulatorHeader title="보장 시뮬레이션" onBack={() => router.back()} />
        <Text style={styles.status}>시뮬레이션을 찾을 수 없습니다.</Text>
      </CoverageSimulatorScreen>
    );
  }

  if (form?.type === 'add') {
    return (
      <CoverageItemForm
        mode="add"
        onClose={() => setForm(null)}
        onSelectCoverage={(input) => {
          void persist(insertCoverageItem(scenario, form.afterOrder, input));
          setForm(null);
        }}
        onSelectTimeMarker={(label) => {
          void persist(insertTimeMarker(scenario, form.afterOrder, label));
          setForm(null);
        }}
      />
    );
  }

  if (form?.type === 'edit') {
    return (
      <CoverageItemForm
        mode="edit"
        item={form.item}
        onClose={() => setForm(null)}
        onSave={(patch) => {
          void persist(updateCoverageItem(scenario, form.item.id, patch), '저장되었습니다.');
          setForm(null);
        }}
        onDelete={() => {
          setDeleteId(form.item.id);
        }}
      />
    );
  }

  const items = sortItems(scenario.items);
  const openEdit = (item: CoverageScenarioItem) => {
    setMenuItemId(null);
    setForm({ type: 'edit', item });
  };

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader
        title={scenario.title}
        onBack={() => router.back()}
        rightLabel={saving ? '저장 중…' : '저장'}
        rightDisabled={saving}
        onRight={() => void saveNow()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>{BLURB[scenario.diseaseType] ?? scenario.description}</Text>
        {toast ? <Text style={styles.toast}>{toast}</Text> : null}
        <CoverageTimeline
          items={items}
          periods={calculateScenarioPeriodTotals(scenario.items)}
          totals={calculateScenarioTotals(scenario)}
          menuItemId={menuItemId}
          onToggleMenu={setMenuItemId}
          onEdit={openEdit}
          onRemove={(itemId) => {
            setMenuItemId(null);
            setDeleteId(itemId);
          }}
          onAddAfter={(afterOrder) => setForm({ type: 'add', afterOrder })}
        />
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.bottomBtn}><CoverageSecondaryButton label="초기화" onPress={() => setConfirmReset(true)} /></View>
        <View style={styles.bottomBtn}>
          <CoveragePrimaryButton label="PDF 미리보기" onPress={() => router.push(`/customer-consulting/coverage-simulation/scenarios/${scenario.id}/pdf` as never)} />
        </View>
      </View>
      <ConfirmDialog
        open={confirmReset}
        title="작성 내용을 초기화할까요?"
        message="현재 입력한 보장 내용이 모두 기본 상태로 돌아갑니다."
        confirmLabel="초기화"
        cancelLabel="취소"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void persist(resetScenarioItems(scenario));
        }}
      />
      <ConfirmDialog
        open={deleteId != null}
        title={scenario.items.find((item) => item.id === deleteId)?.type === 'time-marker' ? '이 시간 구간을 삭제할까요?' : '이 항목을 삭제할까요?'}
        message="삭제 후 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        tone="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          const id = deleteId;
          setDeleteId(null);
          setForm(null);
          if (id) void persist(removeScenarioItem(scenario, id));
        }}
      />
    </CoverageSimulatorScreen>
  );

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 1800);
  }

  async function saveNow() {
    if (!scenario) return;
    setSaving(true);
    await persist(scenario, '저장되었습니다.');
    setSaving(false);
  }
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  lead: { marginBottom: 16, fontSize: 13, lineHeight: 19, color: theme.muted },
  status: { padding: 16, color: theme.muted },
  toast: {
    alignSelf: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    color: '#fff',
    overflow: 'hidden',
    fontSize: 14,
  },
  bottom: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  bottomBtn: { flex: 1 },
});
