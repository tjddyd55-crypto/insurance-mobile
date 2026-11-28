import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';

import { apiRequest } from '../../api/client';

const base = '/api/education-schedules';
const analyzePath = `${base}/ai/analyze`;
const ANALYSIS_TIMEOUT_MS = 90_000;

export type ScheduleInput = { date: string; title: string; instructor: string };
export type EducationSchedule = ScheduleInput & {
  id: string;
  publicScope: 'GROUP_COMMON' | 'GA_COMMON' | 'BRANCH';
  scopeId: number;
  canEdit: boolean;
  canDelete: boolean;
};
type EducationScope = { key: string; type: EducationSchedule['publicScope']; id: number; label: string };
export type Holiday = { date: string; name: string };
export type EducationMonth = {
  month: string;
  schedules: EducationSchedule[];
  holidays: Holiday[];
  canCreate: boolean;
  canSelectScope: boolean;
  readScopes: EducationScope[];
  writeScopes: EducationScope[];
  selectedScope: string | null;
};
type Draft = {
  year: number | null;
  month: number | null;
  rows: { day: number | null; weekday: number | null; title: string; instructor: string; reviewReasons: string[] }[];
};
type AnalyzedRow = ScheduleInput & {
  index: number;
  day: number | null;
  reviewReasons: string[];
  duplicate: boolean;
};
export type AnalysisResult = {
  year: number | null;
  month: number | null;
  yearMonth: string | null;
  needsYearMonthConfirm: boolean;
  rows: AnalyzedRow[];
  excluded: { date: string; text: string; reason: 'holiday' }[];
  draft?: Draft;
};
export type BulkResult = {
  created: number;
  duplicate: number;
  results: ({ status: 'created'; id: string } | { status: 'duplicate' })[];
};

// The server applies the single membership scope for the roles supported in Native.
export function loadEducationMonth(token: string, month: string) {
  return apiRequest<EducationMonth>(`${base}?month=${encodeURIComponent(month)}`, { token });
}

export function saveEducationSchedule(token: string, row: ScheduleInput, id?: string) {
  return apiRequest<{ schedule: EducationSchedule }>(id ? `${base}/${encodeURIComponent(id)}` : base, {
    token,
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(row),
  });
}

export function removeEducationSchedule(token: string, id: string) {
  return apiRequest<void>(`${base}/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
}

export function analyzeEducationImage(token: string, asset: DocumentPickerAsset) {
  const body = new FormData();
  if (asset.file) {
    body.append('file', asset.file);
  } else {
    const file = new File(asset.uri);
    const part = {
      uri: file.uri,
      name: asset.name || 'education-calendar',
      type: asset.mimeType || file.type || 'application/octet-stream',
    };
    // Expo fetch reads bytes(). Keep it non-enumerable for RN fetch, which bridges the URI fields.
    Object.defineProperty(part, 'bytes', { value: () => file.bytes() });
    body.append('file', part as unknown as Blob);
  }
  return apiRequest<AnalysisResult>(analyzePath, { token, method: 'POST', body, timeoutMs: ANALYSIS_TIMEOUT_MS });
}

export function confirmEducationImageMonth(token: string, yearMonth: string, draft: Draft) {
  return apiRequest<AnalysisResult>(`${analyzePath}?yearMonth=${encodeURIComponent(yearMonth)}`, {
    token,
    method: 'POST',
    body: JSON.stringify({ draft }),
  });
}

export function bulkRegisterEducationSchedules(token: string, rows: ScheduleInput[]) {
  return apiRequest<BulkResult>(`${base}/bulk`, { token, method: 'POST', body: JSON.stringify({ rows }) });
}
