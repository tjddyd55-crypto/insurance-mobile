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
import {
  inlineEditBlurGuardDeadline,
  shouldIgnoreInlineEditBlur,
  type CoverageActiveInlineEdit,
} from './coverageInlineEdit';
import { useFocusTextInputWhenAttached } from './focusTextInputAfterAttach';
import { getCoverageCategoryTheme } from './coverageCategoryTheme';
import { coverageItemMoveState } from './scenarioEdits';
import { simulatorTheme as theme } from './simulatorTheme';
import type { CoverageScenarioItem, ScenarioItem, ScenarioItemCategory } from './types';

type Totals = { currentTotal: number; proposedTotal: number };

export type CoverageInlineAmountEditTarget = CoverageActiveInlineEdit;

type Props = {
  items: ScenarioItem[];
  periods: ScenarioPeriodTotal[];
  totals: Totals;
  onEdit: (item: CoverageScenarioItem) => void;
  onRemove: (itemId: string) => void;
  onAddAfter: (afterOrder: number) => void;
  onMove?: (itemId: string, direction: -1 | 1) => void;
  activeInlineEdit?: CoverageActiveInlineEdit;
  onActiveInlineEditChange?: (target: CoverageActiveInlineEdit) => void;
  onInlineAmountCommit?: (itemId: string, field: CoverageInlineAmountField, rawInput: string) => void;
  onInlineTitleCommit?: (itemId: string, label: string) => void;
  onInlineAmountEditFocus?: (anchorRef: RefObject<View | null>) => void;
  /** active inline TextInput commit — outside tap / 다른 action 전 */
  onRegisterInlineEditCommit?: (commit: (() => void) | null) => void;
  /** + / reorder 등 interaction 직전 */
  onBeforeTimelineInteraction?: () => void;
  /** 최신 모바일 미리보기. 시트 안 총합을 숨기고 하단 독 문구를 쓴다. */
  compactTotals?: boolean;
  readOnly?: boolean;
};

/** Native timeline row spacing. 금액 열은 화살표 너비를 빼지 않는다. */
export const timelineLayout = {
  headSideSlotWidth: 28,
  /** 배지·⋯ 슬롯을 같은 너비로 두어 항목명 중심이 행 중심(중앙 구분선)과 일치하게 한다. */
  headInsetWidth: 52,
  headMinHeight: 32,
  headTitleGap: 6,
  compareMinHeight: 68,
  amountSlotMinHeight: 44,
  compareSpineWidth: 24,
  eventPaddingH: 16,
  reorderColumnWidth: 28,
  reorderHitSlop: 4,
} as const;

export function CoverageTimeline({
  items,
  periods,
  totals,
  onEdit,
  onRemove,
  onAddAfter,
  onMove,
  activeInlineEdit = null,
  onActiveInlineEditChange,
  onInlineAmountCommit,
  onInlineTitleCommit,
  onInlineAmountEditFocus,
  onRegisterInlineEditCommit,
  onBeforeTimelineInteraction,
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
                move={readOnly || !onMove ? null : coverageItemMoveState(items, item.id)}
                activeInlineEdit={activeInlineEdit}
                onActiveInlineEditChange={onActiveInlineEditChange}
                onInlineAmountCommit={onInlineAmountCommit}
                onInlineTitleCommit={onInlineTitleCommit}
                onInlineAmountEditFocus={onInlineAmountEditFocus}
                onRegisterInlineEditCommit={onRegisterInlineEditCommit}
                onBeforeInteraction={onBeforeTimelineInteraction}
                onEdit={() => onEdit(item)}
                onMove={onMove ? (direction) => onMove(item.id, direction) : undefined}
              />
            )}
            {readOnly ? null : (
              <TimelineInsertControl
                onPress={() => onAddAfter(item.order)}
                onBeforePress={onBeforeTimelineInteraction}
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
  move,
  activeInlineEdit,
  onActiveInlineEditChange,
  onInlineAmountCommit,
  onInlineTitleCommit,
  onInlineAmountEditFocus,
  onRegisterInlineEditCommit,
  onBeforeInteraction,
  onEdit,
  onMove,
}: {
  item: CoverageScenarioItem;
  readOnly: boolean;
  move: { canMoveUp: boolean; canMoveDown: boolean } | null;
  activeInlineEdit: CoverageActiveInlineEdit;
  onActiveInlineEditChange?: (target: CoverageActiveInlineEdit) => void;
  onInlineAmountCommit?: (itemId: string, field: CoverageInlineAmountField, rawInput: string) => void;
  onInlineTitleCommit?: (itemId: string, label: string) => void;
  onInlineAmountEditFocus?: (anchorRef: RefObject<View | null>) => void;
  onRegisterInlineEditCommit?: (commit: (() => void) | null) => void;
  onBeforeInteraction?: () => void;
  onEdit: () => void;
  onMove?: (direction: -1 | 1) => void;
}) {
  const badge = getCoverageCategoryTheme(item.category);
  const inlineEditEnabled = !readOnly && Boolean(onInlineAmountCommit && onActiveInlineEditChange);
  const showReorder = !readOnly && Boolean(move && onMove);
  const runBefore = (action: () => void) => {
    onBeforeInteraction?.();
    action();
  };
  return (
    <View style={styles.event}>
      <View style={styles.head}>
        <View style={styles.headLeftSlot}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeLabel, { color: badge.fg }]}>{categoryLabel(item.category)}</Text>
          </View>
        </View>
        <View style={styles.headCenter}>
          {inlineEditEnabled && onInlineTitleCommit && onActiveInlineEditChange ? (
            <InlineTitleCell
              itemId={item.id}
              label={item.label}
              editing={activeInlineEdit?.kind === 'title' && activeInlineEdit.itemId === item.id}
              onStartEdit={() =>
                runBefore(() => onActiveInlineEditChange({ kind: 'title', itemId: item.id }))
              }
              onCommit={(raw) => onInlineTitleCommit(item.id, raw)}
              onCancel={() => onActiveInlineEditChange(null)}
              onRegisterCommit={onRegisterInlineEditCommit}
            />
          ) : (
            <Text style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">
              {item.label}
            </Text>
          )}
        </View>
        <View style={styles.headSideSlot}>
          {readOnly ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="항목 수정"
              onPress={() => runBefore(onEdit)}
              style={styles.menuButton}
            >
              <Text style={styles.menuGlyph}>⋯</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.compare}>
        <View style={styles.amountColumn}>
          <View style={styles.amountSlot}>
            <InlineAmountCell
              itemId={item.id}
              field="current"
              amount={item.currentAmount}
              readOnly={!inlineEditEnabled}
              textStyle={styles.amountCurrent}
              editing={
                activeInlineEdit?.kind === 'amount' &&
                activeInlineEdit.itemId === item.id &&
                activeInlineEdit.field === 'current'
              }
              onStartEdit={() => {
                onBeforeInteraction?.();
                onActiveInlineEditChange?.({ kind: 'amount', itemId: item.id, field: 'current' });
              }}
              onInlineAmountEditFocus={onInlineAmountEditFocus}
              onCommit={(raw) => onInlineAmountCommit?.(item.id, 'current', raw)}
              onCancel={() => onActiveInlineEditChange?.(null)}
              onRegisterCommit={onRegisterInlineEditCommit}
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
              editing={
                activeInlineEdit?.kind === 'amount' &&
                activeInlineEdit.itemId === item.id &&
                activeInlineEdit.field === 'proposed'
              }
              onStartEdit={() => {
                onBeforeInteraction?.();
                onActiveInlineEditChange?.({ kind: 'amount', itemId: item.id, field: 'proposed' });
              }}
              onInlineAmountEditFocus={onInlineAmountEditFocus}
              onCommit={(raw) => onInlineAmountCommit?.(item.id, 'proposed', raw)}
              onCancel={() => onActiveInlineEditChange?.(null)}
              onRegisterCommit={onRegisterInlineEditCommit}
            />
          </View>
        </View>
        {showReorder && move && onMove ? (
          <View pointerEvents="box-none" style={styles.reorderOverlay}>
            <View pointerEvents="box-none" style={styles.reorderPill}>
              <ReorderButtons
                vertical
                canMoveUp={move.canMoveUp}
                canMoveDown={move.canMoveDown}
                onMove={(direction) => {
                  onBeforeInteraction?.();
                  onMove(direction);
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** + 원만 터치 가능 — 좌우 라인은 장식 */
export function TimelineInsertControl({
  onPress,
  onBeforePress,
}: {
  onPress: () => void;
  onBeforePress?: () => void;
}) {
  return (
    <View style={styles.add}>
      <View style={styles.addLine} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="항목 추가"
        hitSlop={4}
        onPress={() => {
          onBeforePress?.();
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
  onRegisterCommit,
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
  onRegisterCommit?: (commit: (() => void) | null) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const anchorRef = useRef<View>(null);
  const [draft, setDraft] = useState(() => formatManWonInputDisplay(amount));
  const committedRef = useRef(false);
  const ignoreBlurUntilRef = useRef(0);
  const focusWhenAttached = useFocusTextInputWhenAttached(editing, inputRef);

  useEffect(() => {
    if (!editing) {
      ignoreBlurUntilRef.current = 0;
      return;
    }
    committedRef.current = false;
    setDraft(formatManWonInputDisplay(amount));
    ignoreBlurUntilRef.current = inlineEditBlurGuardDeadline(Date.now());
    onInlineAmountEditFocus?.(anchorRef);
    const refreshFocus = () => {
      ignoreBlurUntilRef.current = inlineEditBlurGuardDeadline(Date.now());
      onInlineAmountEditFocus?.(anchorRef);
    };
    const t1 = setTimeout(refreshFocus, 120);
    const t2 = setTimeout(refreshFocus, 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [amount, editing, onInlineAmountEditFocus]);

  const commitAndClose = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(draft);
    onCancel();
  };

  const handleBlur = () => {
    if (shouldIgnoreInlineEditBlur(ignoreBlurUntilRef.current, Date.now())) {
      inputRef.current?.focus();
      return;
    }
    commitAndClose();
  };

  useEffect(() => {
    if (!editing) {
      onRegisterCommit?.(null);
      return;
    }
    onRegisterCommit?.(() => commitAndClose());
    return () => onRegisterCommit?.(null);
  }, [draft, editing, onRegisterCommit]);

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
        <Text style={textStyle}>
          {formatCoverageAmountLabel(amount)}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      ref={anchorRef}
      style={styles.inlineAmountWrap}
      collapsable={false}
    >
      <TextInput
        ref={inputRef}
        accessibilityLabel="금액 입력"
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        blurOnSubmit
        onLayout={focusWhenAttached}
        value={draft}
        onChangeText={(value) => setDraft(sanitizeManWonInputTyping(value))}
        onSubmitEditing={() => commitAndClose()}
        onBlur={handleBlur}
        style={[styles.inlineAmountInput, textStyle]}
      />
      <Text style={styles.inlineAmountSuffix}>만원</Text>
    </View>
  );
}

function InlineTitleCell({
  label,
  editing,
  onStartEdit,
  onCommit,
  onCancel,
  onRegisterCommit,
}: {
  itemId: string;
  label: string;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (raw: string) => void;
  onCancel: () => void;
  onRegisterCommit?: (commit: (() => void) | null) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState(label);
  const committedRef = useRef(false);
  const ignoreBlurUntilRef = useRef(0);
  const focusWhenAttached = useFocusTextInputWhenAttached(editing, inputRef);

  useEffect(() => {
    if (!editing) {
      ignoreBlurUntilRef.current = 0;
      return;
    }
    committedRef.current = false;
    setDraft(label);
    ignoreBlurUntilRef.current = inlineEditBlurGuardDeadline(Date.now());
  }, [editing, label]);

  const commitAndClose = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(draft);
    onCancel();
  };

  const handleBlur = () => {
    if (shouldIgnoreInlineEditBlur(ignoreBlurUntilRef.current, Date.now())) {
      inputRef.current?.focus();
      return;
    }
    commitAndClose();
  };

  useEffect(() => {
    if (!editing) {
      onRegisterCommit?.(null);
      return;
    }
    onRegisterCommit?.(() => commitAndClose());
    return () => onRegisterCommit?.(null);
  }, [draft, editing, onRegisterCommit]);

  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="항목명 수정"
        onPress={onStartEdit}
        style={styles.titlePressable}
      >
        <Text style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <TextInput
      ref={inputRef}
      accessibilityLabel="항목명 입력"
      returnKeyType="done"
      blurOnSubmit
      multiline
      onLayout={focusWhenAttached}
      value={draft}
      onChangeText={setDraft}
      onSubmitEditing={() => commitAndClose()}
      onBlur={handleBlur}
      style={[styles.eventTitle, styles.inlineTitleInput]}
    />
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
      hitSlop={compact ? timelineLayout.reorderHitSlop : undefined}
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
  return getCoverageCategoryTheme(category);
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
  headLeftSlot: {
    width: timelineLayout.headInsetWidth,
    flexShrink: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1,
  },
  headSideSlot: {
    width: timelineLayout.headInsetWidth,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1,
  },
  menuButton: {
    width: timelineLayout.headSideSlotWidth,
    height: timelineLayout.headSideSlotWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  titlePressable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeLabel: { fontSize: 11, fontWeight: '700' },
  eventTitle: {
    width: '100%',
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    backgroundColor: theme.surface,
    paddingHorizontal: 4,
  },
  inlineTitleInput: {
    width: '100%',
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.primary,
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
    position: 'relative',
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
  /** 구분선 정중앙. 금액 열 터치는 통과하고 화살표만 받는다. */
  reorderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  /** 구분선이 화살표 뒤에서 끊겨 보이지 않도록 시트 배경으로 가린다. */
  reorderPill: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingHorizontal: 2,
    paddingVertical: 2,
    alignItems: 'center',
  },
  amountSlot: {
    flex: 1,
    minHeight: timelineLayout.amountSlotMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  amountPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: timelineLayout.amountSlotMinHeight,
  },
  inlineAmountWrap: {
    width: '100%',
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
