import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  categoryLabel,
  formatCoverageAmountLabel,
  formatTotalAmountLabel,
  periodSubtotalLabelFromMarker,
  type ScenarioPeriodTotal,
} from './coverageAnalysis';
import { coverageItemMoveState } from './scenarioEdits';
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
  onMove?: (itemId: string, direction: -1 | 1) => void;
  /** 최신 모바일 미리보기. 시트 안 총합을 숨기고 하단 독 문구를 쓴다. */
  compactTotals?: boolean;
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
  onMove,
  compactTotals = false,
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
                move={readOnly || !onMove ? null : coverageItemMoveState(items, item.id)}
                onToggleMenu={() => onToggleMenu(menuItemId === item.id ? null : item.id)}
                onEdit={() => onEdit(item)}
                onRemove={() => onRemove(item.id)}
                onMove={onMove ? (direction) => onMove(item.id, direction) : undefined}
              />
            )}
            {readOnly ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="항목 추가"
                onPress={() => onAddAfter(item.order)}
                style={styles.add}
              >
                <View style={styles.addLine} />
                <View style={styles.addPlus}>
                  <Text style={styles.addGlyph}>+</Text>
                </View>
                <View style={styles.addLine} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {compactTotals ? null : <SheetGrandTotal totals={totals} />}
    </View>
  );
}

/** 최신 모바일 미리보기 하단 독. 시트 안 ‘기존 총 보장’ 문구와 띄어쓰기가 다르다. */
export function CoverageTotalsDock({ totals }: { totals: Totals }) {
  return (
    <View style={styles.dock}>
      <View style={styles.dockCol}>
        <Text style={styles.dockLabel}>기존 총보장</Text>
        <Text style={styles.dockAmount}>{formatTotalAmountLabel(totals.currentTotal)}</Text>
      </View>
      <View style={styles.dockDivider} />
      <View style={styles.dockCol}>
        <Text style={styles.dockLabel}>제안 총보장</Text>
        <Text style={[styles.dockAmount, styles.dockProposed]}>{formatTotalAmountLabel(totals.proposedTotal)}</Text>
      </View>
    </View>
  );
}

function SheetGrandTotal({ totals }: { totals: Totals }) {
  return (
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
  );
}

function CoverageBlock({
  item, readOnly, menuOpen, move, onToggleMenu, onEdit, onRemove, onMove,
}: {
  item: CoverageScenarioItem;
  readOnly: boolean;
  menuOpen: boolean;
  move: { canMoveUp: boolean; canMoveDown: boolean } | null;
  onToggleMenu: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onMove?: (direction: -1 | 1) => void;
}) {
  const badge = BADGE[item.category];
  return (
    <View style={styles.event}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeLabel, { color: badge.fg }]}>{categoryLabel(item.category)}</Text>
        </View>
        <Text style={styles.eventTitle} numberOfLines={1}>{item.label}</Text>
        {readOnly ? null : (
          <View style={styles.actions}>
            {move && onMove ? (
              <ReorderButtons
                canMoveUp={move.canMoveUp}
                canMoveDown={move.canMoveDown}
                onMove={onMove}
              />
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="항목 메뉴" onPress={onToggleMenu} style={styles.menuBtn}>
              <Text style={styles.menuGlyph}>⋯</Text>
            </Pressable>
          </View>
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
          {readOnly ? null : <View style={styles.markerGutter} />}
          <View style={styles.markerSeg} />
          <Text style={styles.markerLabel}>{item.label} ↓</Text>
          <View style={styles.markerSeg} />
          {readOnly ? null : (
            <Pressable accessibilityRole="button" accessibilityLabel="시간 구간 메뉴" onPress={onRemove} style={styles.markerMenu}>
              <Text style={styles.menuGlyph}>⋯</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function ReorderButtons({
  canMoveUp, canMoveDown, onMove,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <View style={styles.reorder}>
      <MoveButton label="위로 이동" glyph="↑" enabled={canMoveUp} onPress={() => onMove(-1)} />
      <MoveButton label="아래로 이동" glyph="↓" enabled={canMoveDown} onPress={() => onMove(1)} />
    </View>
  );
}

function MoveButton({
  label, glyph, enabled, onPress,
}: {
  label: string;
  glyph: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.reorderBtn, !enabled && styles.reorderDisabled]}
    >
      <Text style={styles.reorderGlyph}>{glyph}</Text>
    </Pressable>
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
  actions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  reorder: { flexDirection: 'row', alignItems: 'center' },
  reorderBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reorderDisabled: { opacity: 0.28 },
  reorderGlyph: { fontSize: 14, fontWeight: '700', color: theme.muted, lineHeight: 16 },
  menuBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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
  /** PC 모바일 TimelineInsertControl. 보이는 것은 + 원이고, 접근성 이름만 '항목 추가'다. */
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  addLine: { flex: 1, height: 1, backgroundColor: '#dce3ec' },
  addPlus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#b8c8dc',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGlyph: { color: theme.primary, fontSize: 14, fontWeight: '700', lineHeight: 16, textAlign: 'center' },
  marker: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, backgroundColor: '#f8fafc' },
  markerLine: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  markerGutter: { width: 28 },
  /** PC 모바일 `.cs-axis-marker__hline-seg`: height 1px, `var(--cs-period-marker-line)` = `--primary-border` `#bbf7d0`. */
  markerSeg: { flex: 1, height: 1, backgroundColor: theme.primaryBorder },
  markerLabel: { fontSize: 16, fontWeight: '800', color: theme.marker },
  markerMenu: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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
  dock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 54,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  dockCol: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  dockDivider: { width: 1, marginVertical: 8, backgroundColor: theme.border },
  dockLabel: { fontSize: 11, fontWeight: '600', color: theme.muted },
  dockAmount: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  dockProposed: { color: theme.primary },
});
