/**
 * 공유 바인더 — 기존 서버 API(/api/personal-binders/shared…) 그대로. 웹 personalBinderShare.api.ts 와 같은 경로.
 * 페이지 뷰어는 새로 만들지 않는다: 내 바인더로 가져온 뒤 기존 네이티브 BinderViewerScreen 으로 연다.
 */
import { ApiError, apiRequest, resolveApiUrl } from '../../api/client';
import { shareRemoteFile } from '../files/remoteFileSharing';
import { normalizeBinderShareStatus, normalizeSharedBinderDetail, normalizeSharedBinderList, type BinderShareStatus, type SharedBinderDetail, type SharedBinderItem, type SharedBinderSummary } from './sharedBinderModel';

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
  /** 내 바인더 공유 상태(서버 SSOT) / 지점 공유 / 공유 해제 — 웹 personalBinderShare.api.ts 와 같은 API. */
  shareStatus: (binderId: string) => `/api/personal-binders/${id(binderId)}/share-status`,
  shareToGa: (binderId: string) => `/api/personal-binders/${id(binderId)}/share`,
  revoke: (shareId: string) => `/api/personal-binders/shared/${id(shareId)}`,
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

/** 내 바인더의 현재 공유 상태. 로컬 boolean 없이 이 응답이 SSOT. */
export async function getBinderShareStatus(token: string | null, binderId: string): Promise<BinderShareStatus> {
  return normalizeBinderShareStatus(await apiRequest<unknown>(sharedBinderPaths.shareStatus(binderId), { token: requireToken(token) }));
}

/**
 * 지점(GA) 공유 켜기. 서버가 이미 공유 중인 바인더에 새 공유를 만들지 않도록 직전 상태를 다시 읽고,
 * 공유 중이면 그 상태를 그대로 돌려준다. 공유 범위·권한은 서버 정책 그대로(네이티브 정책 없음).
 */
export async function shareBinderToGa(token: string | null, binderId: string): Promise<BinderShareStatus> {
  const current = await getBinderShareStatus(token, binderId);
  if (current.active) return current;
  await apiRequest<unknown>(sharedBinderPaths.shareToGa(binderId), { method: 'POST', token: requireToken(token), body: JSON.stringify({}) });
  return getBinderShareStatus(token, binderId);
}

/** 공유 해제. 서버가 즉시 목록·열람·이미 발급된 페이지 토큰을 막는다(PR #197 정책). */
export async function revokeBinderShare(token: string | null, shareId: string): Promise<void> {
  await apiRequest<unknown>(sharedBinderPaths.revoke(shareId), { method: 'DELETE', token: requireToken(token) });
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
