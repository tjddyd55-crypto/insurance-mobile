import { createMemoryConsultationStorage, webLocalConsultationStorage } from '../consultationStorage';
import {
  deleteConsultation,
  listConsultationSummaries,
  renameConsultation,
  saveConsultation,
} from '../consultationRepository';
import {
  calculateScenarioPeriodTotals,
  calculateScenarioTotals,
  formatTotalAmountLabel,
  periodSubtotalLabelFromMarker,
} from '../coverageAnalysis';
import { createScenarioFromTemplate } from '../templates';
import { appendCoverageItem, customerDisplayLabel, filterSavedByCustomer, filterSavedByDisease, insertCoverageItem } from '../scenarioEdits';

describe('coverage simulation mapping', () => {
  it('builds the cancer consultation and totals in 만원', () => {
    const scenario = createScenarioFromTemplate('cancer');
    expect(scenario?.title).toBe('암 치료');
    expect(scenario?.diseaseType).toBe('cancer');
    expect(createScenarioFromTemplate('heart')).toBeNull();
    const totals = calculateScenarioTotals(scenario!);
    expect(totals.currentTotal).toBeGreaterThan(0);
    expect(totals.proposedTotal).toBeGreaterThan(totals.currentTotal);
    expect(formatTotalAmountLabel(totals.proposedTotal)).toContain('억');
    const periods = calculateScenarioPeriodTotals(scenario!.items);
    expect(periods).toHaveLength(1);
    expect(periodSubtotalLabelFromMarker('1년 후')).toBe('1년간 합계');
  });

  it('stores consultations on the device repository, not a server list', async () => {
    const storage = createMemoryConsultationStorage();
    const created = createScenarioFromTemplate('cancer', { id: 'c1', name: '홍길동' });
    expect(created).not.toBeNull();
    await saveConsultation(storage, 'user-1', created!);
    await saveConsultation(storage, 'user-1', appendCoverageItem(created!, { label: '간병비', category: 'support' }));
    const rows = await listConsultationSummaries(storage, 'user-1', 'cancer', 'c1');
    expect(rows.map((row) => row.title)).toEqual(['암 치료']);
    expect(rows[0]?.customerNameSnapshot).toBe('홍길동');
    const renamed = await renameConsultation(storage, 'user-1', created!.id, '암 상담');
    expect(renamed?.title).toBe('암 상담');
    await deleteConsultation(storage, 'user-1', created!.id);
    expect(await listConsultationSummaries(storage, 'user-1')).toEqual([]);
  });

  it('stores web consultations in localStorage for the signed-in user', async () => {
    const store = new Map<string, string>();
    Object.assign(globalThis, {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    const created = createScenarioFromTemplate('cancer');
    await saveConsultation(webLocalConsultationStorage, 'user-1', created!);
    const rows = await listConsultationSummaries(webLocalConsultationStorage, 'user-1', 'cancer');
    expect(rows).toHaveLength(1);
    expect(store.size).toBe(1);
    const other = await listConsultationSummaries(webLocalConsultationStorage, 'user-2', 'cancer');
    expect(other).toEqual([]);
  });

  it('filters saved consultations the same way as the PC list', () => {
    const rows = [
      { id: '1', title: '암', diseaseType: 'cancer' as const, customerId: 'c1', customerNameSnapshot: '홍길동', consultationDate: '2026-09-26', createdAt: '', updatedAt: '' },
      { id: '2', title: '심장', diseaseType: 'heart' as const, customerId: null, customerNameSnapshot: null, consultationDate: '2026-09-26', createdAt: '', updatedAt: '' },
    ];
    expect(customerDisplayLabel(rows[0]!)).toBe('홍길동 고객');
    expect(customerDisplayLabel(rows[1]!)).toBe('고객 미지정');
    expect(filterSavedByCustomer(rows, 'linked').map((row) => row.id)).toEqual(['1']);
    expect(filterSavedByDisease(rows, 'heart').map((row) => row.id)).toEqual(['2']);
    const scenario = createScenarioFromTemplate('cancer')!;
    const inserted = insertCoverageItem(scenario, scenario.items[0]!.order, { label: '간병비', category: 'support' });
    expect(inserted.items[1]?.label).toBe('간병비');
  });
});
