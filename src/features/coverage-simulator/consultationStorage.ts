import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { ConsultationStoragePort } from './consultationRepository';
import type { CoverageScenario } from './types';

const WEB_STORAGE_PREFIX = 'onefc:coverage-simulator:v1:';

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'guest';
}

function storeFile(userId: string): File {
  const directory = new Directory(Paths.document, 'coverage-simulator');
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return new File(directory, `${safeUserId(userId)}.json`);
}

/** Expo 웹에는 문서 디렉터리가 없다. 기기와 같은 JSON을 브라우저에 둔다. */
export const webLocalConsultationStorage: ConsultationStoragePort = {
  async read(userId) {
    const raw = globalThis.localStorage?.getItem(`${WEB_STORAGE_PREFIX}${safeUserId(userId)}`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as CoverageScenario[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async write(userId, scenarios) {
    if (!globalThis.localStorage) {
      throw new Error('이 브라우저에서는 시뮬레이션을 저장할 수 없습니다.');
    }
    globalThis.localStorage.setItem(`${WEB_STORAGE_PREFIX}${safeUserId(userId)}`, JSON.stringify(scenarios));
  },
};

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

export const consultationStorage: ConsultationStoragePort =
  Platform.OS === 'web' ? webLocalConsultationStorage : fileConsultationStorage;

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
