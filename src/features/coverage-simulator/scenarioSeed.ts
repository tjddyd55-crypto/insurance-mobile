import { normalizeConsultation } from './scenarioEdits';
import { createScenarioFromTemplate } from './templates';
import type { ConsultationStoragePort } from './consultationRepository';
import type { CoverageScenario, DiseaseType } from './types';

/** Idempotent seed identity — canonical code only for initial insert, not immutability. */
export const SEED_SCENARIO_KEYS: Record<Exclude<DiseaseType, 'custom'>, string> = {
  cancer: 'seed:cancer',
  cerebrovascular: 'seed:cerebrovascular',
  heart: 'seed:heart',
  'care-dementia': 'seed:care-dementia',
  'fracture-surgery': 'seed:fracture-surgery',
};

const SEED_DISEASE_ORDER: DiseaseType[] = [
  'cancer',
  'cerebrovascular',
  'heart',
  'care-dementia',
  'fracture-surgery',
  'custom',
];

export function buildSeedScenario(diseaseType: DiseaseType): CoverageScenario | null {
  const draft = createScenarioFromTemplate(diseaseType);
  if (!draft) return null;
  const seedKey = diseaseType === 'custom' ? 'seed:custom' : SEED_SCENARIO_KEYS[diseaseType];
  return {
    ...draft,
    recordType: 'scenario',
    seedKey,
    customerId: null,
    customerNameSnapshot: null,
    customerName: undefined,
  };
}

/** Missing seed scenarios only — never overwrite existing user data. */
export async function ensureSeedScenarios(
  storage: ConsultationStoragePort,
  userId: string,
): Promise<void> {
  const rows = (await storage.read(userId)).map((row) => normalizeConsultation(row));
  const existingKeys = new Set(
    rows.filter((row) => row.seedKey).map((row) => row.seedKey as string),
  );
  let changed = false;
  for (const diseaseType of SEED_DISEASE_ORDER) {
    const key = diseaseType === 'custom' ? 'seed:custom' : SEED_SCENARIO_KEYS[diseaseType];
    if (existingKeys.has(key)) continue;
    const seed = buildSeedScenario(diseaseType);
    if (!seed) continue;
    rows.unshift(seed);
    existingKeys.add(key);
    changed = true;
  }
  if (changed) {
    await storage.write(userId, rows);
  }
}

export function scenarioLibrarySortIndex(row: CoverageScenario): number {
  if (!row.seedKey) return 100;
  const idx = SEED_DISEASE_ORDER.findIndex((d) => {
    const key = d === 'custom' ? 'seed:custom' : SEED_SCENARIO_KEYS[d];
    return row.seedKey === key;
  });
  return idx >= 0 ? idx : 99;
}

export function compareScenarioLibraryRows(a: CoverageScenario, b: CoverageScenario): number {
  const diff = scenarioLibrarySortIndex(a) - scenarioLibrarySortIndex(b);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title, 'ko');
}
