import { Directory, File, Paths } from 'expo-file-system';

import type { ConsultationStoragePort } from './consultationRepository';
import type { CoverageScenario } from './types';

function storeFile(userId: string): File {
  const directory = new Directory(Paths.document, 'coverage-simulator');
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'guest';
  return new File(directory, `${safe}.json`);
}

export const fileConsultationStorage: ConsultationStoragePort = {
  async read(userId) {
    const file = storeFile(userId);
    if (!file.exists) return [];
    try {
      const parsed = JSON.parse(await file.text()) as CoverageScenario[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async write(userId, scenarios) {
    const file = storeFile(userId);
    if (!file.exists) file.create({ overwrite: true });
    file.write(JSON.stringify(scenarios));
  },
};

export function createMemoryConsultationStorage(): ConsultationStoragePort {
  const rows = new Map<string, CoverageScenario[]>();
  return {
    async read(userId) {
      return rows.get(userId)?.map((row) => structuredClone(row)) ?? [];
    },
    async write(userId, scenarios) {
      rows.set(userId, scenarios.map((row) => structuredClone(row)));
    },
  };
}
