import { createMemoryConsultationStorage } from '../consultationStorage';
import {
  deleteConsultation,
  listConsultationSummaries,
  listScenarioLibrary,
  saveConsultation,
} from '../consultationRepository';
import { buildSeedScenario, ensureSeedScenarios } from '../scenarioSeed';
import {
  createSimulationFromScenario,
  createUserScenario,
  isScenarioRecord,
  isSimulationRecord,
  renameScenario,
} from '../scenarioEdits';
import { duplicateScenario } from '../scenarioEdits';

describe('coverage scenario domain', () => {
  it('treats seed scenarios as normal editable scenario records', () => {
    const seed = buildSeedScenario('cancer');
    expect(seed).not.toBeNull();
    expect(isScenarioRecord(seed!)).toBe(true);
    const renamed = renameScenario(seed!, '암 집중 치료');
    expect(renamed?.title).toBe('암 집중 치료');
    const copied = duplicateScenario(seed!);
    expect(copied.recordType).toBe('scenario');
    expect(copied.id).not.toBe(seed!.id);
  });

  it('creates user scenarios without creating simulations', () => {
    const scenario = createUserScenario('갑상선암 치료');
    expect(scenario).not.toBeNull();
    expect(isScenarioRecord(scenario!)).toBe(true);
    expect(isSimulationRecord(scenario!)).toBe(false);
  });

  it('creates simulations as deep copies linked to template id', async () => {
    const storage = createMemoryConsultationStorage();
    const seed = buildSeedScenario('cancer')!;
    await saveConsultation(storage, 'user-1', seed);
    const simulation = createSimulationFromScenario(seed, { id: 'c1', name: '박성현' });
    await saveConsultation(storage, 'user-1', simulation);
    await deleteConsultation(storage, 'user-1', seed.id);
    const remaining = await listConsultationSummaries(storage, 'user-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(simulation.id);
  });

  it('seeds scenarios only when missing seedKey', async () => {
    const storage = createMemoryConsultationStorage();
    await ensureSeedScenarios(storage, 'user-1');
    const first = await listScenarioLibrary(storage, 'user-1');
    expect(first.length).toBeGreaterThanOrEqual(6);
    const renamed = renameScenario(first[0]!, '사용자 수정 seed');
    await saveConsultation(storage, 'user-1', renamed!);
    await ensureSeedScenarios(storage, 'user-1');
    const after = await listScenarioLibrary(storage, 'user-1');
    expect(after.find((row) => row.id === first[0]!.id)?.title).toBe('사용자 수정 seed');
  });
});
