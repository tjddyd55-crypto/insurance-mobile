import { ApiError, apiRequest } from '../../api/client';
import {
  COVERAGE_SHARE_MAX_SNAPSHOT_CHARS,
  coverageShareSnapshotChars,
} from './coverageShareModel';
import { normalizeConsultation } from './scenarioEdits';
import type { CoverageScenario } from './types';

export type CreateCoverageShareResponse = {
  shareId: string;
  shareUrl: string;
  createdAt: string;
  expiresAt: string | null;
  pdfReady: boolean;
};

export type CoverageShareListItem = {
  shareId: string;
  title: string;
  createdAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  pdfReady: boolean;
  shareUrl: string | null;
};

const DEV_PREVIEW_SHARE_PATH = '/api/dev/coverage-simulator/preview-shares';

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError('로그인이 필요합니다.', 401);
  return value;
}

export function coverageConsultationSharesPath(consultationId: string): string {
  return `/api/coverage-simulator/consultations/${encodeURIComponent(consultationId)}/shares`;
}

export function coverageShareRevokePath(shareId: string): string {
  return `/api/coverage-simulator/shares/${encodeURIComponent(shareId)}/revoke`;
}

function assertProductionSharePath(path: string): void {
  if (path.includes(DEV_PREVIEW_SHARE_PATH)) {
    throw new ApiError('Preview 공유 경로는 사용할 수 없습니다.', 400);
  }
}

function absoluteShareUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function readCreateResponse(payload: unknown): CreateCoverageShareResponse {
  const row = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const shareId = String(row.shareId ?? '').trim();
  const shareUrl = absoluteShareUrl(row.shareUrl);
  if (!shareId || !shareUrl) {
    throw new ApiError('공유 링크를 생성하지 못했습니다. 다시 시도해 주세요.', 500);
  }
  return {
    shareId,
    shareUrl,
    createdAt: String(row.createdAt ?? ''),
    expiresAt: row.expiresAt == null || row.expiresAt === '' ? null : String(row.expiresAt),
    pdfReady: row.pdfReady === true,
  };
}

function readShareListItem(value: unknown): CoverageShareListItem | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const shareId = String(row.shareId ?? '').trim();
  if (!shareId) return null;
  return {
    shareId,
    title: String(row.title ?? ''),
    createdAt: String(row.createdAt ?? ''),
    revokedAt: row.revokedAt == null || row.revokedAt === '' ? null : String(row.revokedAt),
    lastViewedAt: row.lastViewedAt == null || row.lastViewedAt === '' ? null : String(row.lastViewedAt),
    viewCount: typeof row.viewCount === 'number' ? row.viewCount : 0,
    pdfReady: row.pdfReady === true,
    shareUrl: absoluteShareUrl(row.shareUrl),
  };
}

function readShareList(payload: unknown): CoverageShareListItem[] {
  const row = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const shares = Array.isArray(row.shares) ? row.shares : [];
  return shares.flatMap((item) => {
    const parsed = readShareListItem(item);
    return parsed ? [parsed] : [];
  });
}

export async function createCoverageSimulationShare(
  token: string | null,
  scenario: CoverageScenario,
): Promise<CreateCoverageShareResponse> {
  const snapshot = normalizeConsultation(scenario);
  if (coverageShareSnapshotChars(snapshot) > COVERAGE_SHARE_MAX_SNAPSHOT_CHARS) {
    throw new ApiError('시나리오 데이터가 너무 큽니다.', 400);
  }
  const path = coverageConsultationSharesPath(snapshot.id);
  assertProductionSharePath(path);
  const payload = await apiRequest<unknown>(path, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({ scenario: snapshot }),
  });
  return readCreateResponse(payload);
}

export async function listCoverageSimulationShares(
  token: string | null,
  consultationId: string,
): Promise<{ shares: CoverageShareListItem[] }> {
  const path = coverageConsultationSharesPath(consultationId);
  assertProductionSharePath(path);
  const payload = await apiRequest<unknown>(path, { token: requireToken(token) });
  return { shares: readShareList(payload) };
}

export async function revokeCoverageSimulationShare(
  token: string | null,
  shareId: string,
): Promise<void> {
  const path = coverageShareRevokePath(shareId);
  assertProductionSharePath(path);
  await apiRequest<unknown>(path, {
    method: 'POST',
    token: requireToken(token),
  });
}
