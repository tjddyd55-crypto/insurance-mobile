import { compareScenarioLibraryRows, ensureSeedScenarios } from './scenarioSeed';
import {
  duplicateScenario,
  isScenarioRecord,
  isSimulationRecord,
  listSummaries,
  normalizeConsultation,
  renameScenario,
} from './scenarioEdits';
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
  const rows = await readConsultations(storage, userId);
  const simulations = rows.filter(isSimulationRecord);
  const summaries = listSummaries(simulations);
  return summaries.filter((row) => {
    if (diseaseType && row.diseaseType !== diseaseType) return false;
    if (customerId) return row.customerId === customerId;
    return true;
  });
}

/** 고객 상세 — customerId가 정확히 일치하는 Simulation만 (null 제외) */
export async function listConsultationsByCustomerId(
  storage: ConsultationStoragePort,
  userId: string,
  customerId: string,
): Promise<SavedScenarioSummary[]> {
  const normalized = customerId.trim();
  if (!normalized) return [];
  return listConsultationSummaries(storage, userId, undefined, normalized);
}

export async function listScenarioLibrary(
  storage: ConsultationStoragePort,
  userId: string,
): Promise<CoverageScenario[]> {
  await ensureSeedScenarios(storage, userId);
  const rows = await readConsultations(storage, userId);
  return rows
    .filter(isScenarioRecord)
    .sort(compareScenarioLibraryRows);
}

export async function listScenarioLibrarySummaries(
  storage: ConsultationStoragePort,
  userId: string,
): Promise<SavedScenarioSummary[]> {
  return (await listScenarioLibrary(storage, userId)).map((row) => ({
    id: row.id,
    title: row.title,
    diseaseType: row.diseaseType,
    customerId: null,
    customerNameSnapshot: null,
    consultationDate: row.consultationDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
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

export async function duplicateConsultation(
  storage: ConsultationStoragePort,
  userId: string,
  scenarioId: string,
): Promise<CoverageScenario | null> {
  const current = await getConsultation(storage, userId, scenarioId);
  if (!current) return null;
  return saveConsultation(storage, userId, duplicateScenario(current));
}
