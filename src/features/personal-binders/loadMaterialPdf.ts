import { ApiError } from '../../api/client';
import { createStorageOpenUrl } from '../storage/storageApi';

const cache = new Map<number, Promise<Uint8Array>>();

export async function loadMaterialPdfBytes(
  token: string | null,
  fileId: number,
): Promise<Uint8Array> {
  const cached = cache.get(fileId);
  if (cached) return cached;
  const loading = fetchPdfBytes(token, fileId);
  cache.set(fileId, loading);
  loading.catch(() => cache.delete(fileId));
  return loading;
}

async function fetchPdfBytes(token: string | null, fileId: number): Promise<Uint8Array> {
  const url = await createStorageOpenUrl(token, fileId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError('PDF를 불러오지 못했습니다.', response.status);
  }
  return new Uint8Array(await response.arrayBuffer());
}
