import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
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
import { coverageQueryKey } from './CoverageSimulationListScreen';
import { CoverageCustomerBar } from './CoverageCustomerBar';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { getConsultation, saveConsultation } from './consultationRepository';
import { fileConsultationStorage } from './consultationStorage';
import {
  COVERAGE_ITEM_CATALOG,
  TIME_MARKER_PRESETS,
  calculateScenarioPeriodTotals,
  calculateScenarioTotals,
  categoryLabel,
  formatConsultationListDate,
  formatCoverageAmountLabel,
  formatManWonInputDisplay,
  formatTotalAmountLabel,
  parseManWonInput,
  periodSubtotalLabelFromMarker,
  sanitizeManWonInputTyping,
  sortItems,
} from './coverageAnalysis';
import {
  appendCoverageItem,
  appendTimeMarker,
  assignCustomer,
  moveScenarioItem,
  removeScenarioItem,
  updateCoverageAmount,
} from './scenarioEdits';
import type { CoverageScenario, CoverageScenarioItem, ScenarioItem, ScenarioItemCategory } from './types';

export function CoverageSimulationScreen({ scenarioId }: { scenarioId: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const customer = useCoverageCustomer();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const query = useQuery({
    queryKey: [...coverageQueryKey(userId), scenarioId],
    queryFn: () => getConsultation(fileConsultationStorage, userId, scenarioId),
    enabled: Boolean(userId && scenarioId),
  });
  const [amountTarget, setAmountTarget] = useState<CoverageScenarioItem | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [proposedInput, setProposedInput] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [markerOpen, setMarkerOpen] = useState(false);
  const [markerLabel, setMarkerLabel] = useState('');
  const [notice, setNotice] = useState('');

  const scenario = query.data;
  const persist = async (next: CoverageScenario) => {
    setNotice('');
    try {
      await saveConsultation(fileConsultationStorage, userId, next);
      await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
    } catch {
      setNotice('보장 분석을 저장하지 못했습니다.');
    }
  };

  if (query.isLoading) {
    return <View style={styles.root}><AppHeader title="보장 분석" showBack showMenu={false} /><LoadingState message="시뮬레이션을 불러오는 중…" /></View>;
  }
  if (!scenario) {
    return <View style={styles.root}><AppHeader title="보장 분석" showBack showMenu={false} /><EmptyState title="시뮬레이션을 찾을 수 없습니다." /></View>;
  }

  const items = sortItems(scenario.items);
  const periods = calculateScenarioPeriodTotals(scenario.items);
  const totals = calculateScenarioTotals(scenario);

  return (
    <View style={styles.root}>
      <AppHeader title={scenario.title} subtitle="보장 분석" showBack showMenu={false} showBillingStatus={false} />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <CoverageCustomerBar />
          <Inline justify="space-between">
            <AppText variant="caption" color="textMuted">상담일 {formatConsultationListDate(scenario.consultationDate)}</AppText>
            <Button
              label="이 고객으로 저장"
              size="sm"
              variant="action"
              onPress={() => void persist(assignCustomer(scenario, { id: customer.id, name: customer.name }))}
            />
          </Inline>
          {notice ? <AppText color="danger">{notice}</AppText> : null}
          <AppText variant="heading">보장 분석</AppText>
          {items.map((item) => (
            <TimelineRow
              key={item.id}
              item={item}
              period={periods.find((entry) => entry.endMarkerId === item.id)}
              onEdit={() => {
                if (item.type !== 'coverage') return;
                setAmountTarget(item);
                setCurrentInput(formatManWonInputDisplay(item.currentAmount));
                setProposedInput(formatManWonInputDisplay(item.proposedAmount));
              }}
              onMove={(direction) => void persist(moveScenarioItem(scenario, item.id, direction))}
              onRemove={() => void persist(removeScenarioItem(scenario, item.id))}
            />
          ))}
          <Inline gap="sm" wrap>
            <Button label="항목 추가" onPress={() => setAddOpen(true)} />
            <Button label="시점 추가" variant="secondary" onPress={() => setMarkerOpen(true)} />
          </Inline>
        </ScrollView>
      </Screen>
      <View style={styles.dock}>
        <Stack gap="xs" style={styles.grow}>
          <AppText variant="caption" color="textMuted">기존 총 보장</AppText>
          <AppText variant="bodyStrong">{formatTotalAmountLabel(totals.currentTotal)}</AppText>
        </Stack>
        <Stack gap="xs" style={styles.grow}>
          <AppText variant="caption" color="brandStrong">제안 총 보장</AppText>
          <AppText variant="bodyStrong" color="brandStrong">{formatTotalAmountLabel(totals.proposedTotal)}</AppText>
        </Stack>
      </View>
      <ModalShell
        open={amountTarget != null}
        title={amountTarget?.label ?? '금액 수정'}
        presentation="dialog"
        onRequestClose={() => setAmountTarget(null)}
        footer={<Button label="저장" onPress={() => void saveAmounts()} />}
      >
        <Stack gap="sm">
          <TextField accessibilityLabel="기존 보장 만원" label="기존 (만원)" keyboardType="number-pad" value={currentInput} onChangeText={(value) => setCurrentInput(sanitizeManWonInputTyping(value))} />
          <TextField accessibilityLabel="제안 보장 만원" label="제안 (만원)" keyboardType="number-pad" value={proposedInput} onChangeText={(value) => setProposedInput(sanitizeManWonInputTyping(value))} />
        </Stack>
      </ModalShell>
      <ModalShell open={addOpen} title="항목 추가" presentation="dialog" scroll onRequestClose={() => setAddOpen(false)}>
        <Stack gap="sm">
          {COVERAGE_ITEM_CATALOG.map((item) => (
            <Button
              key={item.label}
              label={`${categoryLabel(item.category)} · ${item.label}`}
              variant="secondary"
              onPress={() => {
                void persist(appendCoverageItem(scenario, item));
                setAddOpen(false);
              }}
            />
          ))}
          <TextField accessibilityLabel="직접 입력" placeholder="항목 이름" value={customLabel} onChangeText={setCustomLabel} />
          <Button
            label="직접 추가"
            disabled={!customLabel.trim()}
            onPress={() => {
              void persist(appendCoverageItem(scenario, { label: customLabel, category: 'other' satisfies ScenarioItemCategory }));
              setCustomLabel('');
              setAddOpen(false);
            }}
          />
        </Stack>
      </ModalShell>
      <ModalShell open={markerOpen} title="시점 추가" presentation="dialog" onRequestClose={() => setMarkerOpen(false)}>
        <Stack gap="sm">
          {TIME_MARKER_PRESETS.map((label) => (
            <Button key={label} label={label} variant="secondary" onPress={() => { void persist(appendTimeMarker(scenario, label)); setMarkerOpen(false); }} />
          ))}
          <TextField accessibilityLabel="시점" placeholder="예: 1년 후" value={markerLabel} onChangeText={setMarkerLabel} />
          <Button label="추가" disabled={!markerLabel.trim()} onPress={() => { void persist(appendTimeMarker(scenario, markerLabel)); setMarkerLabel(''); setMarkerOpen(false); }} />
        </Stack>
      </ModalShell>
    </View>
  );

  async function saveAmounts() {
    if (!amountTarget || !scenario) return;
    const withCurrent = updateCoverageAmount(scenario, amountTarget.id, 'currentAmount', parseManWonInput(currentInput));
    const next = updateCoverageAmount(withCurrent, amountTarget.id, 'proposedAmount', parseManWonInput(proposedInput));
    setAmountTarget(null);
    await persist(next);
  }
}

function TimelineRow({
  item, period, onEdit, onMove, onRemove,
}: {
  item: ScenarioItem;
  period?: { currentTotal: number; proposedTotal: number };
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  if (item.type === 'time-marker') {
    return (
      <Card>
        <Stack gap="xs">
          <AppText variant="bodyStrong">{item.label}</AppText>
          {period ? (
            <AppText variant="caption" color="textSecondary">
              {periodSubtotalLabelFromMarker(item.label)} · 기존 {formatTotalAmountLabel(period.currentTotal)} / 제안 {formatTotalAmountLabel(period.proposedTotal)}
            </AppText>
          ) : null}
          <RowActions onMove={onMove} onRemove={onRemove} />
        </Stack>
      </Card>
    );
  }
  return (
    <Card>
      <Stack gap="xs">
        <Inline justify="space-between">
          <AppText variant="caption" color="textMuted">{categoryLabel(item.category)}</AppText>
          <Button label="금액" size="sm" variant="ghost" onPress={onEdit} />
        </Inline>
        <AppText variant="bodyStrong">{item.label}</AppText>
        <Inline justify="space-between">
          <AppText>기존 {formatCoverageAmountLabel(item.currentAmount)}</AppText>
          <AppText color="brandStrong">제안 {formatCoverageAmountLabel(item.proposedAmount)}</AppText>
        </Inline>
        <RowActions onMove={onMove} onRemove={onRemove} />
      </Stack>
    </Card>
  );
}

function RowActions({ onMove, onRemove }: { onMove: (direction: -1 | 1) => void; onRemove: () => void }) {
  return (
    <Inline gap="sm">
      <Button label="위로" size="sm" variant="secondary" onPress={() => onMove(-1)} />
      <Button label="아래로" size="sm" variant="secondary" onPress={() => onMove(1)} />
      <Button label="삭제" size="sm" variant="danger" onPress={onRemove} />
    </Inline>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: {
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: 120,
      gap: theme.spacing.md,
    },
    dock: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    grow: { flex: 1, minWidth: 0 },
  });
}
