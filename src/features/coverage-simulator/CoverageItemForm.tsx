import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TextField } from '../../design-system';
import {
  CATALOG_TABS,
  catalogItemsForTab,
  categoryLabel,
  formatManWonInputDisplay,
  parseManWonInput,
  sanitizeManWonInputTyping,
  TIME_MARKER_PRESETS,
  type CatalogTabId,
} from './coverageAnalysis';
import { CoveragePrimaryButton, CoverageSecondaryButton, CoverageSimulatorHeader, CoverageSimulatorScreen } from './CoverageSimulatorChrome';
import { simulatorTheme as theme } from './simulatorTheme';
import type { CoverageScenarioItem, ScenarioItemCategory } from './types';

const CATEGORIES: ScenarioItemCategory[] = ['diagnosis', 'treatment', 'recovery', 'support', 'other'];

type AddProps = {
  mode: 'add';
  onClose: () => void;
  onSelectCoverage: (input: { label: string; category: ScenarioItemCategory }) => void;
  onSelectTimeMarker: (label: string) => void;
};

type EditProps = {
  mode: 'edit';
  item: CoverageScenarioItem;
  onClose: () => void;
  onSave: (patch: { label: string; category: ScenarioItemCategory; currentAmount: number | null; proposedAmount: number | null }) => void;
  onDelete: () => void;
};

export function CoverageItemForm(props: AddProps | EditProps) {
  if (props.mode === 'add') return <AddForm {...props} />;
  return <EditForm {...props} />;
}

function AddForm({ onClose, onSelectCoverage, onSelectTimeMarker }: AddProps) {
  const [tab, setTab] = useState<CatalogTabId>('favorite');
  const [customLabel, setCustomLabel] = useState('');
  const [customCategory, setCustomCategory] = useState<ScenarioItemCategory>('other');
  const [customTime, setCustomTime] = useState('');
  const items = catalogItemsForTab(tab);

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title="항목 추가" onBack={onClose} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabs}>
          {CATALOG_TABS.map((entry) => (
            <Pressable key={entry.id} accessibilityRole="button" onPress={() => setTab(entry.id)} style={[styles.tab, tab === entry.id && styles.tabActive]}>
              <Text style={[styles.tabLabel, tab === entry.id && styles.tabLabelActive]}>{entry.label}</Text>
            </Pressable>
          ))}
        </View>
        {items.length === 0 ? (
          <Text style={styles.empty}>즐겨찾기한 항목이 없습니다.{'\n'}다른 목록의 항목을 선택할 수 있습니다.</Text>
        ) : (
          <View style={styles.catalog}>
            {items.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => onSelectCoverage(item)} style={styles.catalogRow}>
                <Text style={styles.catalogLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text style={styles.section}>직접 추가</Text>
        <TextField accessibilityLabel="항목명" placeholder="항목명을 입력하세요" value={customLabel} onChangeText={setCustomLabel} />
        <View style={styles.chips}>
          {CATEGORIES.map((category) => (
            <Pressable key={category} accessibilityRole="button" onPress={() => setCustomCategory(category)} style={[styles.chip, customCategory === category && styles.chipActive]}>
              <Text style={[styles.chipLabel, customCategory === category && styles.chipLabelActive]}>{categoryLabel(category)}</Text>
            </Pressable>
          ))}
        </View>
        <CoveragePrimaryButton
          label="추가"
          onPress={() => {
            if (!customLabel.trim()) return;
            onSelectCoverage({ label: customLabel, category: customCategory });
          }}
        />
        <Text style={styles.section}>시간 구간</Text>
        <View style={styles.catalog}>
          {TIME_MARKER_PRESETS.map((label) => (
            <Pressable key={label} accessibilityRole="button" onPress={() => onSelectTimeMarker(label)} style={styles.catalogRow}>
              <Text style={styles.catalogLabel}>🕐 {label}</Text>
            </Pressable>
          ))}
        </View>
        <TextField accessibilityLabel="직접 입력" placeholder="예: 18개월 후" value={customTime} onChangeText={setCustomTime} />
        <CoveragePrimaryButton label="추가" onPress={() => { if (customTime.trim()) onSelectTimeMarker(customTime); }} />
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.footerBtn}><CoverageSecondaryButton label="취소" onPress={onClose} /></View>
        <View style={styles.footerBtn}>
          <CoveragePrimaryButton label="추가" onPress={() => { if (customLabel.trim()) onSelectCoverage({ label: customLabel, category: customCategory }); }} />
        </View>
      </View>
    </CoverageSimulatorScreen>
  );
}

function EditForm({ item, onClose, onSave, onDelete }: EditProps) {
  const [label, setLabel] = useState(item.label);
  const [category, setCategory] = useState(item.category);
  const [currentInput, setCurrentInput] = useState(formatManWonInputDisplay(item.currentAmount));
  const [proposedInput, setProposedInput] = useState(formatManWonInputDisplay(item.proposedAmount));

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title="항목 수정" onBack={onClose} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>항목명</Text>
        <TextField accessibilityLabel="항목명" value={label} onChangeText={setLabel} />
        <Text style={styles.section}>카테고리</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((entry) => (
            <Pressable key={entry} accessibilityRole="button" onPress={() => setCategory(entry)} style={[styles.chip, category === entry && styles.chipActive]}>
              <Text style={[styles.chipLabel, category === entry && styles.chipLabelActive]}>{categoryLabel(entry)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>보장 금액</Text>
        <TextField accessibilityLabel="기존 보장" label="기존 보장" keyboardType="number-pad" value={currentInput} onChangeText={(value) => setCurrentInput(sanitizeManWonInputTyping(value))} />
        <TextField accessibilityLabel="제안 보장" label="제안 보장" keyboardType="number-pad" value={proposedInput} onChangeText={(value) => setProposedInput(sanitizeManWonInputTyping(value))} />
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.delete}>
          <Text style={styles.deleteLabel}>삭제</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.footerBtn}><CoverageSecondaryButton label="취소" onPress={onClose} /></View>
        <View style={styles.footerBtn}>
          <CoveragePrimaryButton
            label="저장"
            onPress={() => onSave({
              label,
              category,
              currentAmount: parseManWonInput(currentInput),
              proposedAmount: parseManWonInput(proposedInput),
            })}
          />
        </View>
      </View>
    </CoverageSimulatorScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  tabActive: { borderColor: theme.primaryBorder, backgroundColor: theme.primarySoft },
  tabLabel: { fontSize: 13, color: theme.text },
  tabLabelActive: { color: theme.primary, fontWeight: '700' },
  empty: { textAlign: 'center', color: theme.muted, fontSize: 13, lineHeight: 20, marginVertical: 12 },
  catalog: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  catalogRow: { paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  catalogLabel: { fontSize: 14, fontWeight: '600', color: theme.text },
  section: { fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { borderColor: theme.primaryBorder, backgroundColor: theme.primarySoft },
  chipLabel: { fontSize: 13, color: theme.text },
  chipLabelActive: { color: theme.primary, fontWeight: '700' },
  delete: { marginTop: 8, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2' },
  deleteLabel: { color: theme.danger, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  footerBtn: { flex: 1 },
});
