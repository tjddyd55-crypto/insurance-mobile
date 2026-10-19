/**
 * 공유 바인더 — 기존 서버 API(/api/personal-binders/shared…) 그대로. 웹 personalBinderShare.api.ts 와 같은 경로.
 * 페이지 뷰어는 새로 만들지 않는다: 내 바인더로 가져온 뒤 기존 네이티브 BinderViewerScreen 으로 연다.
 */
import { ApiError, apiRequest, resolveApiUrl } from '../../api/client';
import { shareRemoteFile } from '../files/remoteFileSharing';
import { normalizeSharedBinderDetail, normalizeSharedBinderList, type SharedBinderDetail, type SharedBinderItem, type SharedBinderSummary } from './sharedBinderModel';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

const id = (value: string) => encodeURIComponent(value);

export const sharedBinderPaths = {
  list: '/api/personal-binders/shared',
  detail: (shareId: string) => `/api/personal-binders/shared/${id(shareId)}`,
  importToMine: (shareId: string) => `/api/personal-binders/shared/${id(shareId)}/import`,
  fileDownload: (shareId: string, shareFileId: string) =>
    `/api/personal-binders/shared/${id(shareId)}/files/${id(shareFileId)}/download`,
} as const;

export async function listSharedBinders(token: string | null): Promise<SharedBinderSummary[]> {
  return normalizeSharedBinderList(await apiRequest<unknown>(sharedBinderPaths.list, { token: requireToken(token) }));
}

export async function getSharedBinder(token: string | null, shareId: string): Promise<SharedBinderDetail> {
  return normalizeSharedBinderDetail(await apiRequest<unknown>(sharedBinderPaths.detail(shareId), { token: requireToken(token) }));
}

/** 내 바인더로 가져오기(웹과 같은 import API, Idempotency-Key). 가져온 내 바인더 id 를 돌려준다. */
export async function importSharedBinder(token: string | null, shareId: string, idempotencyKey: string): Promise<{ binderId: string; reused: boolean }> {
  const body = await apiRequest<{ binder?: { id?: unknown }; reused?: unknown }>(sharedBinderPaths.importToMine(shareId), {
    method: 'POST',
    token: requireToken(token),
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ idempotencyKey }),
  });
  const binderId = String(body?.binder?.id ?? '').trim();
  if (!binderId) throw new ApiError('가져온 바인더를 확인하지 못했습니다.', 500);
  return { binderId, reused: body?.reused === true };
}

/** 원본 파일 열기 — 기존 원격 파일 공유 helper(Bearer 헤더, URL 토큰 없음)로 OS 앱에 넘긴다. */
export async function openSharedBinderFile(token: string | null, shareId: string, item: SharedBinderItem): Promise<void> {
  if (!item.shareFileId) throw new ApiError('파일 정보를 찾을 수 없습니다.', 404);
  await shareRemoteFile({
    url: resolveApiUrl(sharedBinderPaths.fileDownload(shareId, item.shareFileId)),
    fileName: item.material.originalFileName || `${item.material.title || '자료'}.pdf`,
    mimeType: item.material.mimeType || null,
    headers: { Authorization: `Bearer ${requireToken(token)}` },
    timeoutMs: 120_000,
  });
}
