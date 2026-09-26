import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  categoryLabel,
  formatCoverageAmountLabel,
  formatTotalAmountLabel,
  periodSubtotalLabelFromMarker,
  type ScenarioPeriodTotal,
} from './coverageAnalysis';
import { simulatorTheme as theme } from './simulatorTheme';
import type { CoverageScenarioItem, ScenarioItem, ScenarioItemCategory } from './types';

type Totals = { currentTotal: number; proposedTotal: number };

type Props = {
  items: ScenarioItem[];
  periods: ScenarioPeriodTotal[];
  totals: Totals;
  menuItemId: string | null;
  onToggleMenu: (itemId: string | null) => void;
  onEdit: (item: CoverageScenarioItem) => void;
  onRemove: (itemId: string) => void;
  onAddAfter: (afterOrder: number) => void;
  readOnly?: boolean;
};

const BADGE = theme.badge;

export function CoverageTimeline({
  items,
  periods,
  totals,
  menuItemId,
  onToggleMenu,
  onEdit,
  onRemove,
  onAddAfter,
  readOnly = false,
}: Props) {
  return (
    <View style={styles.sheet}>
      <View style={styles.colHeader}>
        <Text style={styles.colCurrent}>기존 보장</Text>
        <View style={styles.colTick} />
        <Text style={styles.colProposed}>제안 보장</Text>
      </View>
      <View style={styles.timeline}>
        <View pointerEvents="none" style={styles.centerLine} />
        {items.map((item) => (
          <View key={item.id}>
            {item.type === 'time-marker' ? (
              <MarkerBlock
                item={item}
                period={periods.find((entry) => entry.endMarkerId === item.id)}
                readOnly={readOnly}
                onRemove={() => onRemove(item.id)}
              />
            ) : (
              <CoverageBlock
                item={item}
                readOnly={readOnly}
                menuOpen={menuItemId === item.id}
                onToggleMenu={() => onToggleMenu(menuItemId === item.id ? null : item.id)}
                onEdit={() => onEdit(item)}
                onRemove={() => onRemove(item.id)}
              />
            )}
            {readOnly ? null : (
              <Pressable accessibilityRole="button" onPress={() => onAddAfter(item.order)} style={styles.add}>
                <Text style={styles.addLabel}>+ 항목 추가</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>기존 총 보장</Text>
          <Text style={styles.summaryValue}>{formatTotalAmountLabel(totals.currentTotal)}</Text>
        </View>
        <View style={styles.summarySpine} />
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>제안 총 보장</Text>
          <Text style={[styles.summaryValue, styles.summaryProposed]}>{formatTotalAmountLabel(totals.proposedTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

function CoverageBlock({
  item, readOnly, menuOpen, onToggleMenu, onEdit, onRemove,
}: {
  item: CoverageScenarioItem;
  readOnly: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const badge = BADGE[item.category];
  return (
    <View style={styles.event}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeLabel, { color: badge.fg }]}>{categoryLabel(item.category)}</Text>
        </View>
        <Text style={styles.eventTitle} numberOfLines={1}>{item.label}</Text>
        {readOnly ? <View style={styles.menuBtn} /> : (
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.label} 메뉴`} onPress={onToggleMenu} style={styles.menuBtn}>
            <Text style={styles.menuGlyph}>⋯</Text>
          </Pressable>
        )}
      </View>
      {menuOpen ? (
        <View style={styles.menu}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={styles.menuItem}><Text style={styles.menuText}>항목 수정</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onRemove} style={styles.menuItem}><Text style={styles.menuDanger}>삭제</Text></Pressable>
        </View>
      ) : null}
      <View style={styles.compare}>
        <Text style={styles.amountCurrent}>{formatCoverageAmountLabel(item.currentAmount)}</Text>
        <View style={styles.compareSpine} />
        <Text style={styles.amountProposed}>{formatCoverageAmountLabel(item.proposedAmount)}</Text>
      </View>
    </View>
  );
}

function MarkerBlock({
  item, period, readOnly, onRemove,
}: {
  item: Extract<ScenarioItem, { type: 'time-marker' }>;
  period?: ScenarioPeriodTotal;
  readOnly: boolean;
  onRemove: () => void;
}) {
  return (
    <View>
      {period ? <PeriodSubtotal label={item.label} current={period.currentTotal} proposed={period.proposedTotal} /> : null}
      <View style={styles.marker}>
        <View style={styles.markerLine}>
          <View style={styles.markerSeg} />
          <Text style={styles.markerLabel}>{item.label} ↓</Text>
          <View style={styles.markerSeg} />
        </View>
        {readOnly ? null : (
          <Pressable accessibilityRole="button" onPress={onRemove}>
            <Text style={styles.markerDelete}>삭제</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function PeriodSubtotal({ label, current, proposed }: { label: string; current: number; proposed: number }) {
  const side = (amount: number) => (amount <= 0 ? '없음' : formatTotalAmountLabel(amount));
  return (
    <View style={styles.period}>
      <Text style={styles.periodHeading}>{periodSubtotalLabelFromMarker(label)}</Text>
      <View style={styles.periodRow}>
        <Text style={styles.periodValue}>{side(current)}</Text>
        <View style={styles.periodSpine} />
        <Text style={[styles.periodValue, styles.periodProposed]}>{side(proposed)}</Text>
      </View>
    </View>
  );
}

export function badgeColor(category: ScenarioItemCategory) {
  return BADGE[category];
}

export const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: 10,
    overflow: 'hidden',
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    backgroundColor: theme.summaryBg,
  },
  colCurrent: { flex: 1, textAlign: 'center', color: theme.headerAxis, fontSize: 13, fontWeight: '700' },
  colProposed: { flex: 1, textAlign: 'center', color: theme.primary, fontSize: 13, fontWeight: '700' },
  colTick: { width: 1, height: 20, backgroundColor: '#cbd5e1' },
  timeline: { position: 'relative', paddingVertical: 8 },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: theme.line,
    zIndex: -1,
  },
  event: { paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.divider },
  /** PC 모바일과 같이 항목명 줄에 카드 배경을 깔아 축선이 글자를 관통하지 않게 한다. 금액 줄은 배경이 없어 선이 남는다. */
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
    marginBottom: 12,
    position: 'relative',
    backgroundColor: theme.surface,
    zIndex: 1,
  },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeLabel: { fontSize: 11, fontWeight: '700' },
  eventTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
  },
  menuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  menuGlyph: { fontSize: 18, color: theme.muted },
  menu: {
    alignSelf: 'flex-end',
    minWidth: 148,
    marginBottom: 8,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  menuText: { fontSize: 13, color: theme.text },
  menuDanger: { fontSize: 13, color: theme.danger },
  compare: { flexDirection: 'row', alignItems: 'center', minHeight: 72 },
  compareSpine: { width: 24 },
  amountCurrent: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: theme.current },
  amountProposed: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: theme.primary },
  add: { paddingVertical: 8, paddingHorizontal: 16 },
  addLabel: { textAlign: 'center', color: theme.muted, fontSize: 13, fontWeight: '600' },
  marker: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, backgroundColor: '#f8fafc' },
  markerLine: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  markerSeg: { flex: 1, height: 1, backgroundColor: theme.border },
  markerLabel: { fontSize: 16, fontWeight: '800', color: theme.marker },
  markerDelete: { marginTop: 8, fontSize: 13, color: theme.muted, textDecorationLine: 'underline' },
  period: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(226, 232, 240, 0.35)',
  },
  periodHeading: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: theme.muted, marginBottom: 8 },
  periodRow: { flexDirection: 'row', alignItems: 'center' },
  periodSpine: { width: 12 },
  periodValue: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#334155' },
  periodProposed: { color: theme.primary, fontWeight: '700' },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 2,
    borderTopColor: theme.summaryLine,
    backgroundColor: theme.summaryBg,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summarySpine: { width: 24 },
  summaryLabel: { fontSize: 13, color: theme.muted, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: theme.text },
  summaryProposed: { color: theme.primary },
});
