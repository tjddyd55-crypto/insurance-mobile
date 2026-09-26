import { listSummaries, normalizeConsultation, renameScenario } from './scenarioEdits';
import type { CoverageScenario, DiseaseType, SavedScenarioSummary } from './types';

export type ConsultationStoragePort = {
  read: (userId: string) => Promise<CoverageScenario[]>;
  write: (userId: string, scenarios: CoverageScenario[]) => Promise<void>;
};

export async function readConsultations(
  storage: ConsultationStoragePort,
  userId: string,
): Promise<CoverageScenario[]> {
  const rows = await storage.read(userId);
  return rows.map(normalizeConsultation);
}

export async function listConsultationSummaries(
  storage: ConsultationStoragePort,
  userId: string,
  diseaseType?: DiseaseType,
  customerId?: string | null,
): Promise<SavedScenarioSummary[]> {
  const summaries = listSummaries(await readConsultations(storage, userId));
  return summaries.filter((row) => {
    if (diseaseType && row.diseaseType !== diseaseType) return false;
    if (customerId) return row.customerId === customerId;
    return true;
  });
}

export async function getConsultation(
  storage: ConsultationStoragePort,
  userId: string,
  scenarioId: string,
): Promise<CoverageScenario | null> {
  const rows = await readConsultations(storage, userId);
  return rows.find((row) => row.id === scenarioId) ?? null;
}

export async function saveConsultation(
  storage: ConsultationStoragePort,
  userId: string,
  scenario: CoverageScenario,
): Promise<CoverageScenario> {
  const rows = await readConsultations(storage, userId);
  const next = normalizeConsultation(scenario);
  const index = rows.findIndex((row) => row.id === next.id);
  if (index >= 0) rows[index] = next;
  else rows.unshift(next);
  await storage.write(userId, rows);
  return next;
}

export async function deleteConsultation(
  storage: ConsultationStoragePort,
  userId: string,
  scenarioId: string,
): Promise<void> {
  const rows = await readConsultations(storage, userId);
  await storage.write(userId, rows.filter((row) => row.id !== scenarioId));
}

export async function renameConsultation(
  storage: ConsultationStoragePort,
  userId: string,
  scenarioId: string,
  title: string,
): Promise<CoverageScenario | null> {
  const current = await getConsultation(storage, userId, scenarioId);
  if (!current) return null;
  const renamed = renameScenario(current, title);
  if (!renamed) return null;
  return saveConsultation(storage, userId, renamed);
}
