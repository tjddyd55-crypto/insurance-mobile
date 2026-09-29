import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, ModalShell, TextField } from '../../design-system';
import { coverageQueryKey } from './CoverageSimulationListScreen';
import {
  deleteConsultation,
  duplicateConsultation,
  renameConsultation,
} from './consultationRepository';
import { consultationStorage } from './consultationStorage';
import { formatConsultationListDate } from './coverageAnalysis';
import { customerDisplayLabel } from './scenarioEdits';
import { simulatorTheme as theme } from './simulatorTheme';
import type { SavedScenarioSummary } from './types';

type Props = {
  rows: SavedScenarioSummary[];
  emptyLabel?: string;
  onRefresh: () => Promise<void>;
};

export function SavedScenarioCrudPanel({
  rows,
  emptyLabel = '저장된 시뮬레이션이 없습니다.',
  onRefresh,
}: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuRow, setMenuRow] = useState<SavedScenarioSummary | null>(null);
  const [renameRow, setRenameRow] = useState<SavedScenarioSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteRow, setDeleteRow] = useState<SavedScenarioSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const openScenario = (id: string) => {
    router.push(`/customer-consulting/coverage-simulation/scenarios/${id}` as never);
  };

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
    await onRefresh();
  };

  async function submitDuplicate() {
    if (!menuRow || !userId) return;
    setBusy(true);
    setNotice('');
    try {
      const copied = await duplicateConsultation(consultationStorage, userId, menuRow.id);
      setMenuRow(null);
      if (!copied) {
        setNotice('복제하지 못했습니다.');
        return;
      }
      await invalidate();
      openScenario(copied.id);
    } catch {
      setNotice('복제하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function submitRename() {
    if (!renameRow || !renameTitle.trim() || !userId) return;
    setBusy(true);
    try {
      const updated = await renameConsultation(consultationStorage, userId, renameRow.id, renameTitle);
      if (!updated) {
        setNotice('제목을 수정하지 못했습니다.');
        return;
      }
      setRenameRow(null);
      setNotice('제목이 수정되었습니다.');
      await invalidate();
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
      await invalidate();
    } catch {
      setNotice('삭제하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {!rows.length ? <Text style={styles.muted}>{emptyLabel}</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={styles.listCard}>
          <Pressable accessibilityRole="button" onPress={() => openScenario(row.id)} style={styles.listMain}>
            <Text style={styles.listTitle}>{row.title}</Text>
            <Text style={styles.meta}>{customerDisplayLabel(row)}</Text>
            <Text style={styles.meta}>
              수정 {formatConsultationListDate(row.updatedAt)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${row.title} 메뉴`}
            onPress={() => setMenuRow(row)}
            style={styles.more}
          >
            <Text style={styles.moreGlyph}>⋯</Text>
          </Pressable>
        </View>
      ))}

      <ModalShell open={menuRow != null} title={menuRow?.title ?? ''} presentation="dialog" onRequestClose={() => setMenuRow(null)}>
        <View style={styles.menuStack}>
          <Button label="열기" onPress={() => { if (menuRow) openScenario(menuRow.id); setMenuRow(null); }} />
          <Button
            label="이름 변경"
            variant="secondary"
            onPress={() => {
              setRenameRow(menuRow);
              setRenameTitle(menuRow?.title ?? '');
              setMenuRow(null);
            }}
          />
          <Button label="복제" variant="secondary" onPress={() => void submitDuplicate()} />
          <Button label="삭제" variant="danger" onPress={() => { setDeleteRow(menuRow); setMenuRow(null); }} />
        </View>
      </ModalShell>

      <ModalShell
        open={renameRow != null}
        title="시나리오 이름 변경"
        presentation="dialog"
        busy={busy}
        onRequestClose={() => setRenameRow(null)}
        footer={<Button label="저장" loading={busy} onPress={() => void submitRename()} />}
      >
        <TextField
          accessibilityLabel="시나리오 제목"
          value={renameTitle}
          onChangeText={setRenameTitle}
          error={!renameTitle.trim() ? '제목을 입력해 주세요.' : undefined}
        />
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
    </>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.muted, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  notice: { color: theme.primary, fontSize: 13, marginBottom: 8 },
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
  listTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 4 },
  meta: { fontSize: 12, color: theme.muted, lineHeight: 17 },
  more: { width: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  moreGlyph: { fontSize: 20, color: theme.muted },
  menuStack: { gap: 8 },
});
