import type { CoverageScenario, CoverageScenarioItem, ScenarioItem, ScenarioItemCategory } from './types';

const MAN_WON = 10_000;

export function parseManWonInput(raw: string): number | null {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = Number(digits);
  if (!Number.isFinite(value) || value < 0) return null;
  return value * MAN_WON;
}

export function formatManWonInputDisplay(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) return '';
  const man = Math.round(amount / MAN_WON);
  return man > 0 ? man.toLocaleString('ko-KR') : '';
}

export function sanitizeManWonInputTyping(raw: string): string {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

export function formatCoverageAmountLabel(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) return '없음';
  if (amount % MAN_WON === 0) return `${(amount / MAN_WON).toLocaleString('ko-KR')} 만원`;
  return `${amount.toLocaleString('ko-KR')} 원`;
}

export function formatTotalAmountLabel(amount: number): string {
  if (amount <= 0) return '0 원';
  if (amount >= 100_000_000 && amount % MAN_WON === 0) {
    const eok = Math.floor(amount / 100_000_000);
    const restMan = (amount % 100_000_000) / MAN_WON;
    if (restMan === 0) return `${eok.toLocaleString('ko-KR')}억`;
    return `${eok.toLocaleString('ko-KR')}억 ${restMan.toLocaleString('ko-KR')} 만원`;
  }
  if (amount % MAN_WON === 0) return `${(amount / MAN_WON).toLocaleString('ko-KR')} 만원`;
  return `${amount.toLocaleString('ko-KR')} 원`;
}

export function formatConsultationListDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const [year, month, day] = iso.slice(0, 10).split('-');
  if (!year || !month || !day) return '—';
  return `${year}.${month}.${day}`;
}

export function categoryLabel(category: ScenarioItemCategory): string {
  switch (category) {
    case 'diagnosis':
      return '진단';
    case 'treatment':
      return '치료';
    case 'recovery':
      return '회복';
    case 'support':
      return '지원';
    default:
      return '기타';
  }
}

export const COVERAGE_ITEM_CATALOG: { label: string; category: ScenarioItemCategory }[] = [
  { label: '암 진단금', category: 'diagnosis' },
  { label: '암 수술비', category: 'treatment' },
  { label: '항암약물치료', category: 'treatment' },
  { label: '방사선치료', category: 'treatment' },
  { label: '표적항암치료', category: 'treatment' },
  { label: '입원비', category: 'treatment' },
  { label: '통원치료비', category: 'treatment' },
  { label: '간병비', category: 'support' },
  { label: '생활비 지원', category: 'support' },
  { label: '재활치료비', category: 'recovery' },
];

export const TIME_MARKER_PRESETS = ['3개월 후', '6개월 후', '1년 후', '2년 후'] as const;

export function periodSubtotalLabelFromMarker(markerLabel: string): string {
  const trimmed = markerLabel.trim();
  if (!trimmed) return '구간 합계';
  if (trimmed.endsWith('후')) {
    const span = trimmed.replace(/\s*후\s*$/, '');
    if (span) return `${span}간 합계`;
  }
  return '구간 합계';
}

export function listCoverageItems(scenario: CoverageScenario): CoverageScenarioItem[] {
  return scenario.items
    .filter((item): item is CoverageScenarioItem => item.type === 'coverage')
    .sort((left, right) => left.order - right.order);
}

export function calculateScenarioTotals(scenario: CoverageScenario): {
  currentTotal: number;
  proposedTotal: number;
} {
  return sumCoverageAmounts(listCoverageItems(scenario));
}

export function sumCoverageAmounts(items: CoverageScenarioItem[]): {
  currentTotal: number;
  proposedTotal: number;
} {
  return items.reduce(
    (totals, item) => ({
      currentTotal: totals.currentTotal + (item.currentAmount ?? 0),
      proposedTotal: totals.proposedTotal + (item.proposedAmount ?? 0),
    }),
    { currentTotal: 0, proposedTotal: 0 },
  );
}

export type ScenarioPeriodTotal = {
  endMarkerId: string;
  currentTotal: number;
  proposedTotal: number;
};

export function calculateScenarioPeriodTotals(items: ScenarioItem[]): ScenarioPeriodTotal[] {
  const periods: ScenarioPeriodTotal[] = [];
  let segment: CoverageScenarioItem[] = [];
  for (const item of sortItems(items)) {
    if (item.type === 'time-marker') {
      periods.push({ endMarkerId: item.id, ...sumCoverageAmounts(segment) });
      segment = [];
      continue;
    }
    segment.push(item);
  }
  return periods;
}

export function sortItems(items: ScenarioItem[]): ScenarioItem[] {
  return [...items].sort((left, right) => left.order - right.order);
}
