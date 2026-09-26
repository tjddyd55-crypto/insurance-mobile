import { createMemoryConsultationStorage } from '../consultationStorage';
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
import { appendCoverageItem } from '../scenarioEdits';

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
});
