import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, Screen } from '../../design-system';
import { CoverageAnalysisSaveSection } from './CoverageAnalysisSaveSection';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import { CoverageItemForm } from './CoverageItemForm';
import { CoveragePrimaryButton, CoverageSecondaryButton } from './CoverageSimulatorChrome';
import { CoverageTimeline, CoverageTotalsDock, type CoverageInlineAmountEditTarget } from './CoverageTimeline';
import { coverageInlineAmountPatch } from './coverageInlineAmount';
import {
  commitRegisteredInlineAmount,
  shouldCommitInlineBeforeNextEdit,
} from './coverageInlineAmountSession';
import { scrollInlineAmountIntoView } from './coverageInlineAmountScroll';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { getConsultation, saveConsultation } from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { calculateScenarioPeriodTotals, calculateScenarioTotals, sortItems } from './coverageAnalysis';
import {
  assignCustomer,
  isScenarioRecord,
  insertCoverageItem,
  insertTimeMarker,
  moveScenarioItem,
  removeScenarioItem,
  resetScenarioItems,
  updateCoverageItem,
} from './scenarioEdits';
import { resolveCoverageEditorBackPath } from './coverageSimulatorNavigation';
import { simulatorTheme as theme } from './simulatorTheme';
import type { CoverageScenario, CoverageScenarioItem } from './types';
import { useCoverageShareSession } from './useCoverageShareSession';

type FormState =
  | { type: 'add'; afterOrder: number }
  | { type: 'edit'; item: CoverageScenarioItem }
  | null;

export function CoverageSimulationScreen({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { user, token } = useAuth();
  const customer = useCoverageCustomer();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...coverageQueryKey(userId), scenarioId],
    queryFn: () => getConsultation(consultationStorage, userId, scenarioId),
    enabled: Boolean(userId && scenarioId),
  });
  const [form, setForm] = useState<FormState>(null);
  const [inlineAmountEdit, setInlineAmountEdit] = useState<CoverageInlineAmountEditTarget>(null);
  const inlineAmountCommitRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYOffsetRef = useRef(0);
  const keyboardInsetRef = useRef(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [notice, setNotice] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 1800);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardInsetRef.current = event.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardInsetRef.current = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const share = useCoverageShareSession({
    token,
    scenario: query.data ?? null,
    dirty: false,
    persisted: Boolean(query.data),
    showToast,
    saveScenario: async (next) => {
      const saved = await saveConsultation(consultationStorage, userId, next);
      await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
      return saved;
    },
  });

  const commitActiveInlineAmount = useCallback(() => {
    if (!inlineAmountEdit) return;
    commitRegisteredInlineAmount(inlineAmountCommitRef);
    Keyboard.dismiss();
  }, [inlineAmountEdit]);

  const beforeTimelineInteraction = useCallback(() => {
    commitActiveInlineAmount();
  }, [commitActiveInlineAmount]);

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
    setInlineAmountEdit(null);
    setForm({ type: 'edit', item });
  };

  const runWithInlineCommit = (action: () => void) => {
    commitActiveInlineAmount();
    action();
  };

  const editingScenarioTemplate = isScenarioRecord(scenario);

  const saveFromHeader = async () => {
    commitActiveInlineAmount();
    setSavingCustomer(true);
    setNotice('');
    try {
      if (editingScenarioTemplate) {
        await persist(scenario, '저장되었습니다.');
      } else {
        await persist(assignCustomer(scenario, { id: customer.id, name: customer.name }), '저장되었습니다.');
      }
    } finally {
      setSavingCustomer(false);
    }
  };

  const headerSave = (
    <Button
      label="저장"
      size="sm"
      variant="action"
      loading={savingCustomer}
      disabled={savingCustomer}
      onPress={() => void saveFromHeader()}
    />
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title={scenario.title}
        showBack
        showMenu={false}
        showBillingStatus={false}
        rightAction={headerSave}
        onBackPress={() => router.replace(resolveCoverageEditorBackPath(scenario) as never)}
      />
      <Screen padded={false}>
        <View style={styles.body}>
          <KeyboardAvoidingView
            style={styles.body}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              onScrollBeginDrag={() => {
                commitActiveInlineAmount();
              }}
              onMomentumScrollBegin={commitActiveInlineAmount}
              onScroll={(event) => {
                scrollYOffsetRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
                {editingScenarioTemplate ? null : (
                  <CoverageAnalysisSaveSection
                    notice={notice}
                    onDismissMenu={commitActiveInlineAmount}
                  />
                )}
                {editingScenarioTemplate && notice ? (
                  <Text style={styles.noticeInline}>{notice}</Text>
                ) : null}
                {toast ? <Text style={styles.toast}>{toast}</Text> : null}
                <TouchableWithoutFeedback onPress={commitActiveInlineAmount} accessible={false}>
                  <View>
                    <CoverageTimeline
                      items={items}
                      periods={calculateScenarioPeriodTotals(scenario.items)}
                      totals={totals}
                      compactTotals
                      onEdit={openEdit}
                      inlineAmountEdit={inlineAmountEdit}
                      onRegisterInlineAmountCommit={(commit) => {
                        inlineAmountCommitRef.current = commit;
                      }}
                      onBeforeTimelineInteraction={beforeTimelineInteraction}
                      onInlineAmountEditChange={(target) => {
                        if (shouldCommitInlineBeforeNextEdit(inlineAmountEdit, target)) {
                          commitActiveInlineAmount();
                        }
                        if (target) {
                          setForm(null);
                        }
                        setInlineAmountEdit(target);
                      }}
                      onInlineAmountEditFocus={(anchorRef) => {
                        scrollInlineAmountIntoView(
                          scrollRef,
                          anchorRef,
                          keyboardInsetRef.current,
                          scrollYOffsetRef.current,
                        );
                      }}
                      onInlineAmountCommit={(itemId, field, rawInput) => {
                        const patch = coverageInlineAmountPatch(field, rawInput);
                        void persist(updateCoverageItem(scenario, itemId, patch), '저장되었습니다.');
                        setInlineAmountEdit(null);
                      }}
                      onMove={(itemId, direction) => {
                        void persist(moveScenarioItem(scenario, itemId, direction));
                      }}
                      onRemove={(itemId) => {
                        setDeleteId(itemId);
                      }}
                      onAddAfter={(afterOrder) => {
                        setInlineAmountEdit(null);
                        setForm({ type: 'add', afterOrder });
                      }}
                    />
                  </View>
                </TouchableWithoutFeedback>
            </ScrollView>
          </KeyboardAvoidingView>
          <CoverageTotalsDock totals={totals} />
          <View style={styles.bottom}>
            <View style={styles.bottomBtn}>
              <CoverageSecondaryButton label="초기화" onPress={() => runWithInlineCommit(() => setConfirmReset(true))} />
            </View>
            <View style={styles.bottomBtn}>
              <CoverageSecondaryButton
                label={share.buttonLabel}
                disabled={!share.canShare || share.sharing}
                onPress={() => runWithInlineCommit(() => void share.copyShareLink())}
                testID="coverage-share-button"
              />
            </View>
            <View style={styles.bottomBtn}>
              <CoveragePrimaryButton
                label="PDF 미리보기"
                onPress={() =>
                  runWithInlineCommit(() =>
                    router.push(`/customer-consulting/coverage-simulation/scenarios/${scenario.id}/pdf` as never),
                  )
                }
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
        title={
          scenario.items.find((item) => item.id === deleteId)?.type === 'time-marker'
            ? '이 시간 구간을 삭제할까요?'
            : '항목을 삭제할까요?'
        }
        message={
          scenario.items.find((item) => item.id === deleteId)?.type === 'time-marker'
            ? '삭제 후 되돌릴 수 없습니다.'
            : '이 항목을 삭제합니다.'
        }
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
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  body: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  noticeInline: { color: theme.danger, fontSize: 13, marginBottom: 4 },
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
