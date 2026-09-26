import { createScenarioId } from './templates';
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

export function moveScenarioItem(
  scenario: CoverageScenario,
  itemId: string,
  direction: -1 | 1,
): CoverageScenario {
  const sorted = sortAndReindex(scenario.items);
  const index = sorted.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) return scenario;
  const next = [...sorted];
  const [entry] = next.splice(index, 1);
  if (!entry) return scenario;
  next.splice(target, 0, entry);
  return touch(scenario, next);
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
