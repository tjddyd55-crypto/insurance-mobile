import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Screen } from '../../design-system';
import { CoverageAnalysisSaveSection } from './CoverageAnalysisSaveSection';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import { CoverageItemForm } from './CoverageItemForm';
import { CoveragePrimaryButton, CoverageSecondaryButton } from './CoverageSimulatorChrome';
import { CoverageTimeline, CoverageTotalsDock } from './CoverageTimeline';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { getConsultation, saveConsultation } from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { calculateScenarioPeriodTotals, calculateScenarioTotals, sortItems } from './coverageAnalysis';
import {
  assignCustomer,
  insertCoverageItem,
  insertTimeMarker,
  moveScenarioItem,
  removeScenarioItem,
  resetScenarioItems,
  updateCoverageItem,
} from './scenarioEdits';
import { simulatorTheme as theme } from './simulatorTheme';
import type { CoverageScenario, CoverageScenarioItem } from './types';

type FormState =
  | { type: 'add'; afterOrder: number }
  | { type: 'edit'; item: CoverageScenarioItem }
  | null;

export function CoverageSimulationScreen({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const customer = useCoverageCustomer();
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
  const [notice, setNotice] = useState('');

  const scenario = query.data;
  const persist = async (next: CoverageScenario, message = '') => {
    setNotice('');
    try {
      await saveConsultation(consultationStorage, userId, next);
      await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
      if (message) showToast(message);
    } catch {
      setNotice('보장 분석을 저장하지 못했습니다.');
    }
  };

  if (query.isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader title="보장 분석" showBack showMenu={false} showBillingStatus={false} />
        <LoadingState message="시뮬레이션을 불러오는 중…" />
      </View>
    );
  }
  if (!scenario) {
    return (
      <View style={styles.root}>
        <AppHeader title="보장 분석" showBack showMenu={false} showBillingStatus={false} />
        <EmptyState title="시뮬레이션을 찾을 수 없습니다." />
      </View>
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
        onDelete={() => setDeleteId(form.item.id)}
      />
    );
  }

  const items = sortItems(scenario.items);
  const totals = calculateScenarioTotals(scenario);
  const openEdit = (item: CoverageScenarioItem) => {
    setMenuItemId(null);
    setForm({ type: 'edit', item });
  };

  return (
    <View style={styles.root}>
      <AppHeader title={scenario.title} subtitle="보장 분석" showBack showMenu={false} showBillingStatus={false} />
      <Screen padded={false}>
        <View style={styles.body}>
          <ScrollView contentContainerStyle={styles.content}>
            <CoverageAnalysisSaveSection
              consultationDate={scenario.consultationDate}
              notice={notice}
              onSave={() => void persist(assignCustomer(scenario, { id: customer.id, name: customer.name }))}
            />
            {toast ? <Text style={styles.toast}>{toast}</Text> : null}
            <CoverageTimeline
              items={items}
              periods={calculateScenarioPeriodTotals(scenario.items)}
              totals={totals}
              compactTotals
              menuItemId={menuItemId}
              onToggleMenu={setMenuItemId}
              onEdit={openEdit}
              onMove={(itemId, direction) => void persist(moveScenarioItem(scenario, itemId, direction))}
              onRemove={(itemId) => {
                setMenuItemId(null);
                setDeleteId(itemId);
              }}
              onAddAfter={(afterOrder) => setForm({ type: 'add', afterOrder })}
            />
          </ScrollView>
          <CoverageTotalsDock totals={totals} />
          <View style={styles.bottom}>
            <View style={styles.bottomBtn}><CoverageSecondaryButton label="초기화" onPress={() => setConfirmReset(true)} /></View>
            <View style={styles.bottomBtn}>
              <CoveragePrimaryButton
                label="PDF 미리보기"
                onPress={() => router.push(`/customer-consulting/coverage-simulation/scenarios/${scenario.id}/pdf` as never)}
              />
            </View>
          </View>
        </View>
      </Screen>
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
    </View>
  );

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 1800);
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  body: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 16 },
  toast: {
    alignSelf: 'center',
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
