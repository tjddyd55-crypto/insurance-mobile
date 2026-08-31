import { ApiError, apiRequest } from '../../api/client';
import { normalizeMemo, normalizeMemoList } from './memoModel';
import type { MemoRecord } from './types';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function listMemos(token: string | null): Promise<MemoRecord[]> {
  const body = await apiRequest<unknown>('/api/memo', { token: requireToken(token) });
  return normalizeMemoList(body);
}

export async function createMemo(token: string | null, content: string): Promise<MemoRecord> {
  const body = await apiRequest<unknown>('/api/memo', {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({
      content, x: 100, y: 100, width: 260, height: 200, zIndex: Date.now(), fontSize: 16, fontWeight: 'normal',
    }),
  });
  return normalizeMemo(body, '메모 등록');
}

export async function updateMemo(
  token: string | null,
  memoId: string,
  content: string,
): Promise<MemoRecord> {
  const body = await apiRequest<unknown>(`/api/memo/${encodeURIComponent(memoId)}`, {
    method: 'PUT',
    token: requireToken(token),
    body: JSON.stringify({ content }),
  });
  return normalizeMemo(body, '메모 수정');
}

export async function deleteMemo(token: string | null, memoId: string): Promise<void> {
  await apiRequest<unknown>(`/api/memo/${encodeURIComponent(memoId)}`, {
    method: 'DELETE',
    token: requireToken(token),
  });
}
