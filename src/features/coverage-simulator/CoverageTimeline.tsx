import { useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';

import {
  categoryLabel,
  formatCoverageAmountLabel,
  formatManWonInputDisplay,
  formatTotalAmountLabel,
  periodSubtotalLabelFromMarker,
  sanitizeManWonInputTyping,
  type ScenarioPeriodTotal,
} from './coverageAnalysis';
import type { CoverageInlineAmountField } from './coverageInlineAmount';
import { resolveCoverageItemMenuToggle } from './coverageEditorPresentation';
import { coverageItemMoveState } from './scenarioEdits';
import { simulatorTheme as theme } from './simulatorTheme';
import type { CoverageScenarioItem, ScenarioItem, ScenarioItemCategory } from './types';

type Totals = { currentTotal: number; proposedTotal: number };

export type CoverageInlineAmountEditTarget = {
  itemId: string;
  field: CoverageInlineAmountField;
} | null;

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
  inlineAmountEdit?: CoverageInlineAmountEditTarget;
  onInlineAmountEditChange?: (target: CoverageInlineAmountEditTarget) => void;
  onInlineAmountCommit?: (itemId: string, field: CoverageInlineAmountField, rawInput: string) => void;
  onInlineAmountEditFocus?: (anchorRef: RefObject<View | null>) => void;
  /** 최신 모바일 미리보기. 시트 안 총합을 숨기고 하단 독 문구를 쓴다. */
  compactTotals?: boolean;
  readOnly?: boolean;
};

const BADGE = theme.badge;

/** Native timeline row spacing — 정렬 보정용 (기능/구조 변경 없음) */
const timelineLayout = {
  headSideSlotWidth: 28,
  headMinHeight: 32,
  headTitleGap: 6,
  compareMinHeight: 68,
  amountSlotMinHeight: 44,
  compareSpineWidth: 24,
  eventPaddingH: 16,
  reorderColumnWidth: 28,
} as const;

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
  inlineAmountEdit = null,
  onInlineAmountEditChange,
  onInlineAmountCommit,
  onInlineAmountEditFocus,
  compactTotals = false,
  readOnly = false,
}: Props) {
  return (
    <View style={styles.sheet}>
      <Pressable
        accessibilityRole="button"
        disabled={readOnly || menuItemId == null}
        onPress={() => onToggleMenu(null)}
        style={styles.colHeader}
      >
        <Text style={styles.colCurrent}>기존 보장</Text>
        <View style={styles.colTick} />
        <Text style={styles.colProposed}>제안 보장</Text>
      </Pressable>
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
                menuItemId={menuItemId}
                menuOpen={menuItemId === item.id}
                move={readOnly || !onMove ? null : coverageItemMoveState(items, item.id)}
                inlineAmountEdit={inlineAmountEdit}
                onInlineAmountEditChange={onInlineAmountEditChange}
                onInlineAmountCommit={onInlineAmountCommit}
                onInlineAmountEditFocus={onInlineAmountEditFocus}
                onDismissMenu={() => onToggleMenu(null)}
                onToggleMenu={() => onToggleMenu(resolveCoverageItemMenuToggle(menuItemId, item.id))}
                onEdit={() => onEdit(item)}
                onRemove={() => onRemove(item.id)}
                onMove={onMove ? (direction) => onMove(item.id, direction) : undefined}
              />
            )}
            {readOnly ? null : (
              <TimelineInsertControl
                onPress={() => onAddAfter(item.order)}
                onDismissMenu={() => onToggleMenu(null)}
              />
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
  item,
  readOnly,
  menuItemId,
  menuOpen,
  move,
  inlineAmountEdit,
  onInlineAmountEditChange,
  onInlineAmountCommit,
  onInlineAmountEditFocus,
  onDismissMenu,
  onToggleMenu,
  onEdit,
  onRemove,
  onMove,
}: {
  item: CoverageScenarioItem;
  readOnly: boolean;
  menuItemId: string | null;
  menuOpen: boolean;
  move: { canMoveUp: boolean; canMoveDown: boolean } | null;
  inlineAmountEdit: CoverageInlineAmountEditTarget;
  onInlineAmountEditChange?: (target: CoverageInlineAmountEditTarget) => void;
  onInlineAmountCommit?: (itemId: string, field: CoverageInlineAmountField, rawInput: string) => void;
  onInlineAmountEditFocus?: (anchorRef: RefObject<View | null>) => void;
  onDismissMenu: () => void;
  onToggleMenu: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onMove?: (direction: -1 | 1) => void;
}) {
  const badge = BADGE[item.category];
  const inlineEditEnabled = !readOnly && Boolean(onInlineAmountCommit && onInlineAmountEditChange);
  const foreignMenuOpen = menuItemId != null && menuItemId !== item.id;
  return (
    <View style={styles.event}>
      <View style={styles.head}>
        {menuOpen ? (
          <Pressable
            accessibilityLabel="메뉴 닫기"
            onPress={onDismissMenu}
            style={styles.headDismissBackdrop}
          />
        ) : null}
        <View style={styles.headSideSlot} />
        <View style={styles.headCenter}>
          <Pressable
            style={styles.titleGroupPressable}
            disabled={!foreignMenuOpen && !menuOpen}
            onPress={() => {
              if (menuOpen || foreignMenuOpen) {
                onDismissMenu();
              }
            }}
          >
            <View style={styles.titleGroup}>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeLabel, { color: badge.fg }]}>{categoryLabel(item.category)}</Text>
              </View>
              <Text style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">
                {item.label}
              </Text>
            </View>
          </Pressable>
        </View>
        {readOnly ? (
          <View style={styles.headSideSlot} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="항목 메뉴"
            onPress={onToggleMenu}
            style={styles.headSideSlot}
          >
            <Text style={styles.menuGlyph}>⋯</Text>
          </Pressable>
        )}
      </View>
      {menuOpen && !(inlineAmountEdit?.itemId === item.id) ? (
        <View style={styles.menu}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onDismissMenu();
              onEdit();
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuText}>항목 수정</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onDismissMenu();
              onRemove();
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuDanger}>삭제</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.compare}>
        <View style={styles.amountColumn}>
          {!readOnly && move && onMove ? (
            <ReorderButtons
              vertical
              canMoveUp={move.canMoveUp}
              canMoveDown={move.canMoveDown}
              onMove={(direction) => {
                onDismissMenu();
                onMove(direction);
              }}
            />
          ) : readOnly ? null : (
            <View style={styles.reorderPlaceholder} />
          )}
          <View style={styles.amountSlot}>
            <InlineAmountCell
              itemId={item.id}
              field="current"
              amount={item.currentAmount}
              readOnly={!inlineEditEnabled}
              textStyle={styles.amountCurrent}
              editing={inlineAmountEdit?.itemId === item.id && inlineAmountEdit.field === 'current'}
              onStartEdit={() => {
                onDismissMenu();
                onInlineAmountEditChange?.({ itemId: item.id, field: 'current' });
              }}
              onInlineAmountEditFocus={onInlineAmountEditFocus}
              onCommit={(raw) => onInlineAmountCommit?.(item.id, 'current', raw)}
              onCancel={() => onInlineAmountEditChange?.(null)}
            />
          </View>
        </View>
        <View style={styles.compareSpine} />
        <View style={styles.amountColumnProposed}>
          <View style={styles.amountSlot}>
            <InlineAmountCell
              itemId={item.id}
              field="proposed"
              amount={item.proposedAmount}
              readOnly={!inlineEditEnabled}
              textStyle={styles.amountProposed}
              editing={inlineAmountEdit?.itemId === item.id && inlineAmountEdit.field === 'proposed'}
              onStartEdit={() => {
                onDismissMenu();
                onInlineAmountEditChange?.({ itemId: item.id, field: 'proposed' });
              }}
              onInlineAmountEditFocus={onInlineAmountEditFocus}
              onCommit={(raw) => onInlineAmountCommit?.(item.id, 'proposed', raw)}
              onCancel={() => onInlineAmountEditChange?.(null)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** + 원만 터치 가능 — 좌우 라인은 장식 */
export function TimelineInsertControl({
  onPress,
  onDismissMenu,
}: {
  onPress: () => void;
  onDismissMenu?: () => void;
}) {
  return (
    <View style={styles.add}>
      <View style={styles.addLine} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="항목 추가"
        hitSlop={4}
        onPress={() => {
          onDismissMenu?.();
          onPress();
        }}
        style={styles.addPlus}
      >
        <Text style={styles.addGlyph}>+</Text>
      </Pressable>
      <View style={styles.addLine} />
    </View>
  );
}

function InlineAmountCell({
  readOnly,
  amount,
  textStyle,
  editing,
  onStartEdit,
  onCommit,
  onCancel,
  onInlineAmountEditFocus,
}: {
  itemId: string;
  field: CoverageInlineAmountField;
  amount: number | null;
  readOnly: boolean;
  textStyle: object;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (rawInput: string) => void;
  onCancel: () => void;
  onInlineAmountEditFocus?: (anchorRef: RefObject<View | null>) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const anchorRef = useRef<View>(null);
  const [draft, setDraft] = useState(() => formatManWonInputDisplay(amount));
  const committedRef = useRef(false);

  useEffect(() => {
    if (!editing) return;
    committedRef.current = false;
    setDraft(formatManWonInputDisplay(amount));
    inputRef.current?.focus();
    onInlineAmountEditFocus?.(anchorRef);
    const t1 = setTimeout(() => onInlineAmountEditFocus?.(anchorRef), 120);
    const t2 = setTimeout(() => onInlineAmountEditFocus?.(anchorRef), 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [amount, editing, onInlineAmountEditFocus]);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(draft);
  };

  if (readOnly) {
    return <Text style={textStyle}>{formatCoverageAmountLabel(amount)}</Text>;
  }

  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="금액 수정"
        onPress={onStartEdit}
        style={styles.amountPressable}
      >
        <Text style={textStyle}>{formatCoverageAmountLabel(amount)}</Text>
      </Pressable>
    );
  }

  return (
    <View ref={anchorRef} style={styles.inlineAmountWrap} collapsable={false}>
      <TextInput
        ref={inputRef}
        accessibilityLabel="금액 입력"
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        blurOnSubmit
        value={draft}
        onChangeText={(value) => setDraft(sanitizeManWonInputTyping(value))}
        onSubmitEditing={() => {
          commit();
          onCancel();
        }}
        onBlur={() => {
          commit();
          onCancel();
        }}
        style={[styles.inlineAmountInput, textStyle]}
      />
      <Text style={styles.inlineAmountSuffix}>만원</Text>
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
  vertical = false,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  vertical?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <View style={vertical ? styles.reorderVertical : styles.reorder}>
      <MoveButton label="위로 이동" glyph="↑" enabled={canMoveUp} onPress={() => onMove(-1)} compact={vertical} />
      <MoveButton label="아래로 이동" glyph="↓" enabled={canMoveDown} onPress={() => onMove(1)} compact={vertical} />
    </View>
  );
}

function MoveButton({
  label, glyph, enabled, onPress, compact = false,
}: {
  label: string;
  glyph: string;
  enabled: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={[compact ? styles.reorderBtnCompact : styles.reorderBtn, !enabled && styles.reorderDisabled]}
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
  event: {
    paddingHorizontal: timelineLayout.eventPaddingH,
    paddingVertical: 10,
  },
  /** PC 모바일과 같이 항목명 줄에 카드 배경을 깔아 축선이 글자를 관통하지 않게 한다. 금액 줄은 배경이 없어 선이 남는다. */
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: timelineLayout.headMinHeight,
    marginBottom: timelineLayout.headTitleGap,
    position: 'relative',
    backgroundColor: theme.surface,
    zIndex: 1,
  },
  headDismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  } as ViewStyle,
  headSideSlot: {
    width: timelineLayout.headSideSlotWidth,
    height: timelineLayout.headSideSlotWidth,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  titleGroupPressable: {
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeLabel: { fontSize: 11, fontWeight: '700' },
  eventTitle: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    backgroundColor: theme.surface,
    paddingHorizontal: 4,
  },
  reorder: { flexDirection: 'row', alignItems: 'center' },
  reorderBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reorderBtnCompact: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  reorderDisabled: { opacity: 0.28 },
  reorderGlyph: { fontSize: 14, fontWeight: '700', color: theme.muted, lineHeight: 16 },
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
  compare: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: timelineLayout.compareMinHeight,
  },
  amountColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  amountColumnProposed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  compareSpine: { width: timelineLayout.compareSpineWidth, alignSelf: 'stretch' },
  reorderVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: timelineLayout.reorderColumnWidth,
    flexShrink: 0,
    alignSelf: 'center',
  },
  reorderPlaceholder: {
    width: timelineLayout.reorderColumnWidth,
    flexShrink: 0,
  },
  amountSlot: {
    flex: 1,
    minHeight: timelineLayout.amountSlotMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  amountPressable: { alignItems: 'center', justifyContent: 'center', minHeight: timelineLayout.amountSlotMinHeight },
  inlineAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: timelineLayout.amountSlotMinHeight,
  },
  inlineAmountInput: {
    minWidth: 56,
    maxWidth: 120,
    flexShrink: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  inlineAmountSuffix: { fontSize: 13, fontWeight: '600', color: theme.muted },
  amountCurrent: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: theme.current },
  amountProposed: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: theme.primary },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingVertical: 8,
    paddingHorizontal: timelineLayout.eventPaddingH,
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
  markerSeg: { flex: 1, height: 2, backgroundColor: theme.primary },
  markerLabel: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  markerMenu: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  period: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(226, 232, 240, 0.35)',
  },
  periodHeading: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: theme.muted, marginBottom: 8 },
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
