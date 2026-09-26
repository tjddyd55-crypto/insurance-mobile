import { createScenarioFromTemplate, createScenarioId } from './templates';
import type {
  CoverageScenario,
  CoverageScenarioItem,
  SavedScenarioSummary,
  ScenarioItem,
  ScenarioItemCategory,
} from './types';

export function resolveCustomerNameSnapshot(
  scenario: Pick<CoverageScenario, 'customerNameSnapshot' | 'customerName'>,
): string | null {
  return scenario.customerNameSnapshot ?? scenario.customerName ?? null;
}

export function normalizeConsultation(scenario: CoverageScenario): CoverageScenario {
  const snapshot = resolveCustomerNameSnapshot(scenario);
  return {
    ...scenario,
    customerId: scenario.customerId ?? null,
    customerNameSnapshot: snapshot,
    customerName: snapshot ?? undefined,
    kind: 'consultation',
    items: sortAndReindex(scenario.items ?? []),
  };
}

function sortAndReindex(items: ScenarioItem[]): ScenarioItem[] {
  return [...items]
    .sort((left, right) => left.order - right.order)
    .map((item, order) => ({ ...item, order }));
}

export function toSummary(scenario: CoverageScenario): SavedScenarioSummary {
  return {
    id: scenario.id,
    title: scenario.title,
    diseaseType: scenario.diseaseType,
    customerId: scenario.customerId ?? null,
    customerNameSnapshot: resolveCustomerNameSnapshot(scenario),
    consultationDate: scenario.consultationDate,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  };
}

export function listSummaries(scenarios: CoverageScenario[]): SavedScenarioSummary[] {
  return scenarios
    .map((scenario) => toSummary(normalizeConsultation(scenario)))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function filterSummaries(
  summaries: SavedScenarioSummary[],
  diseaseType?: SavedScenarioSummary['diseaseType'],
  customerId?: string | null,
): SavedScenarioSummary[] {
  return summaries.filter((row) => {
    if (diseaseType && row.diseaseType !== diseaseType) return false;
    if (customerId) return row.customerId === customerId;
    return true;
  });
}

function touch(scenario: CoverageScenario, items: ScenarioItem[]): CoverageScenario {
  return normalizeConsultation({
    ...scenario,
    items,
    updatedAt: new Date().toISOString(),
  });
}

export function renameScenario(scenario: CoverageScenario, title: string): CoverageScenario | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  return normalizeConsultation({ ...scenario, title: trimmed, updatedAt: new Date().toISOString() });
}

/** 보장 항목은 같은 시간 구간 안에서만 순서를 바꾼다. 시간 표시는 옮기지 않는다. */
export function coverageItemMoveState(
  items: ScenarioItem[],
  itemId: string,
): { canMoveUp: boolean; canMoveDown: boolean } {
  const sorted = sortAndReindex(items);
  const index = sorted.findIndex((item) => item.id === itemId);
  if (index < 0 || sorted[index]?.type !== 'coverage') {
    return { canMoveUp: false, canMoveDown: false };
  }
  const { start, end } = coveragePeriodBounds(sorted, index);
  return { canMoveUp: index > start, canMoveDown: index < end };
}

export function moveScenarioItem(
  scenario: CoverageScenario,
  itemId: string,
  direction: -1 | 1,
): CoverageScenario {
  const state = coverageItemMoveState(scenario.items, itemId);
  if (direction < 0 && !state.canMoveUp) return scenario;
  if (direction > 0 && !state.canMoveDown) return scenario;
  const sorted = sortAndReindex(scenario.items);
  const index = sorted.findIndex((item) => item.id === itemId);
  const target = index + direction;
  const next = [...sorted];
  const [entry] = next.splice(index, 1);
  if (!entry) return scenario;
  next.splice(target, 0, entry);
  return touch(scenario, withSequentialOrder(next));
}

function coveragePeriodBounds(sortedItems: ScenarioItem[], coverageIndex: number): { start: number; end: number } {
  let start = 0;
  for (let index = coverageIndex - 1; index >= 0; index -= 1) {
    if (sortedItems[index]?.type === 'time-marker') {
      start = index + 1;
      break;
    }
  }
  let end = sortedItems.length - 1;
  for (let index = coverageIndex + 1; index < sortedItems.length; index += 1) {
    if (sortedItems[index]?.type === 'time-marker') {
      end = index - 1;
      break;
    }
  }
  return { start, end };
}

export function removeScenarioItem(scenario: CoverageScenario, itemId: string): CoverageScenario {
  return touch(scenario, scenario.items.filter((item) => item.id !== itemId));
}

export function updateCoverageAmount(
  scenario: CoverageScenario,
  itemId: string,
  field: 'currentAmount' | 'proposedAmount',
  amount: number | null,
): CoverageScenario {
  const items = scenario.items.map((item) => {
    if (item.id !== itemId || item.type !== 'coverage') return item;
    return { ...item, [field]: amount };
  });
  return touch(scenario, items);
}

export function appendCoverageItem(
  scenario: CoverageScenario,
  input: { label: string; category: ScenarioItemCategory },
): CoverageScenario {
  const label = input.label.trim();
  if (!label) return scenario;
  const item: CoverageScenarioItem = {
    id: createScenarioId(),
    type: 'coverage',
    category: input.category,
    label,
    currentAmount: null,
    proposedAmount: null,
    order: scenario.items.length,
  };
  return touch(scenario, [...scenario.items, item]);
}

export function appendTimeMarker(scenario: CoverageScenario, label: string): CoverageScenario {
  const trimmed = label.trim();
  if (!trimmed) return scenario;
  return touch(scenario, [
    ...scenario.items,
    { id: createScenarioId(), type: 'time-marker', label: trimmed, order: scenario.items.length },
  ]);
}

export type ConsultationCustomerFilter = 'all' | 'linked' | 'unassigned';

export function customerDisplayLabel(row: {
  customerId?: string | null;
  customerNameSnapshot?: string | null;
}): string {
  if (row.customerId && row.customerNameSnapshot) return `${row.customerNameSnapshot} 고객`;
  return '고객 미지정';
}

export function filterSavedByCustomer(
  rows: SavedScenarioSummary[],
  filter: ConsultationCustomerFilter,
): SavedScenarioSummary[] {
  if (filter === 'linked') return rows.filter((row) => Boolean(row.customerId));
  if (filter === 'unassigned') return rows.filter((row) => !row.customerId);
  return rows;
}

export function filterSavedByDisease(
  rows: SavedScenarioSummary[],
  filter: CoverageScenario['diseaseType'] | 'all',
): SavedScenarioSummary[] {
  if (filter === 'all') return rows;
  return rows.filter((row) => row.diseaseType === filter);
}

export function resetScenarioItems(scenario: CoverageScenario): CoverageScenario {
  const fresh = createScenarioFromTemplate(scenario.diseaseType);
  if (!fresh) return scenario;
  return touch(scenario, fresh.items);
}

export function insertCoverageItem(
  scenario: CoverageScenario,
  afterOrder: number,
  input: { label: string; category: ScenarioItemCategory },
): CoverageScenario {
  const label = input.label.trim();
  if (!label) return scenario;
  return insertItem(scenario, afterOrder, {
    id: createScenarioId(),
    type: 'coverage',
    category: input.category,
    label,
    currentAmount: null,
    proposedAmount: null,
    order: 0,
  });
}

export function insertTimeMarker(scenario: CoverageScenario, afterOrder: number, label: string): CoverageScenario {
  const trimmed = label.trim();
  if (!trimmed) return scenario;
  return insertItem(scenario, afterOrder, {
    id: createScenarioId(),
    type: 'time-marker',
    label: trimmed,
    order: 0,
  });
}

export function updateCoverageItem(
  scenario: CoverageScenario,
  itemId: string,
  patch: Partial<Pick<CoverageScenarioItem, 'label' | 'category' | 'currentAmount' | 'proposedAmount'>>,
): CoverageScenario {
  const items = scenario.items.map((item) => {
    if (item.id !== itemId || item.type !== 'coverage') return item;
    return { ...item, ...patch, label: patch.label?.trim() || item.label };
  });
  return touch(scenario, items);
}

function insertItem(scenario: CoverageScenario, afterOrder: number, item: ScenarioItem): CoverageScenario {
  const sorted = sortAndReindex(scenario.items);
  const index = sorted.findIndex((entry) => entry.order === afterOrder);
  const next = [...sorted];
  next.splice(index < 0 ? next.length : index + 1, 0, item);
  return touch(scenario, withSequentialOrder(next));
}

function withSequentialOrder(items: ScenarioItem[]): ScenarioItem[] {
  return items.map((item, order) => ({ ...item, order }));
}

export function assignCustomer(
  scenario: CoverageScenario,
  customer: { id: string | null; name: string | null },
): CoverageScenario {
  return normalizeConsultation({
    ...scenario,
    customerId: customer.id,
    customerNameSnapshot: customer.name,
    customerName: customer.name ?? undefined,
    updatedAt: new Date().toISOString(),
  });
}
