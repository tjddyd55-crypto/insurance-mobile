import { ApiError, apiRequest } from '../../api/client';
import { createStorageOpenUrl } from '../storage/storageApi';
import { normalizeStorageFile, normalizeStorageFolder } from '../storage/storageModel';
import type { CustomerFile, CustomerFolder, Consultation } from './types';

function auth(token: string | null): string {
  if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401);
  return token.trim();
}

function normalizeCustomerFolder(value: unknown, customerId: number): CustomerFolder | null {
  const folder = normalizeStorageFolder(value);
  if (!folder) return null;
  return { ...folder, customerId };
}

function normalizeCustomerFile(value: unknown): CustomerFile | null {
  const file = normalizeStorageFile(value);
  if (!file) return null;
  return {
    id: file.id,
    displayName: file.displayName,
    fileName: file.fileName,
    fileUrl: file.fileUrl,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    createdAt: file.createdAt,
    folderId: file.folderId,
  };
}

export async function listConsultations(token: string | null, customerId: number) {
  return apiRequest<Consultation[]>(`/api/customers/${customerId}/consultations?limit=200`, {
    token: auth(token),
  });
}

export async function createConsultation(
  token: string | null,
  customerId: number,
  payload: Omit<Consultation, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>,
) {
  return apiRequest<Consultation>(`/api/customers/${customerId}/consultations`, {
    method: 'POST',
    token: auth(token),
    body: JSON.stringify(payload),
  });
}

export async function updateConsultation(
  token: string | null,
  customerId: number,
  id: number,
  payload: Partial<Consultation>,
) {
  return apiRequest<Consultation>(`/api/customers/${customerId}/consultations/${id}`, {
    method: 'PATCH',
    token: auth(token),
    body: JSON.stringify(payload),
  });
}

export async function deleteConsultation(token: string | null, customerId: number, id: number) {
  await apiRequest(`/api/customers/${customerId}/consultations/${id}`, {
    method: 'DELETE',
    token: auth(token),
  });
}

export async function listCustomerFolders(
  token: string | null,
  customerId: number,
): Promise<CustomerFolder[]> {
  const rows = await apiRequest<unknown[]>(`/api/storage/folders?customerId=${customerId}`, {
    token: auth(token),
  });
  return rows
    .map((row) => normalizeCustomerFolder(row, customerId))
    .filter((row): row is CustomerFolder => Boolean(row));
}

export async function createCustomerFolder(
  token: string | null,
  customerId: number,
  name: string,
  parentId: number | null,
): Promise<CustomerFolder> {
  const created = await apiRequest<unknown>('/api/storage/folders', {
    method: 'POST',
    token: auth(token),
    body: JSON.stringify({
      name: name.trim(),
      customerId,
      parentId,
    }),
  });
  const folder = normalizeCustomerFolder(created, customerId);
  if (!folder) throw new ApiError('폴더 생성 응답이 올바르지 않습니다.', 502);
  return folder;
}

export async function listCustomerFiles(
  token: string | null,
  customerId: number,
): Promise<CustomerFile[]> {
  const rows = await apiRequest<unknown[]>(`/api/storage/files?customerId=${customerId}`, {
    token: auth(token),
  });
  return rows
    .map(normalizeCustomerFile)
    .filter((row): row is CustomerFile => Boolean(row));
}

export async function openCustomerFile(token: string | null, id: number) {
  return createStorageOpenUrl(token, id);
}

export async function deleteCustomerFile(token: string | null, id: number) {
  await apiRequest(`/api/storage/files/${id}`, {
    method: 'DELETE',
    token: auth(token),
  });
}

export async function uploadCustomerFile(
  token: string | null,
  customerId: number,
  asset: { uri: string; name: string; mimeType?: string | null; size?: number },
  folderId: number | null = null,
) {
  const bearer = auth(token);
  const blob = await fetch(asset.uri).then((response) => response.blob());
  const contentType = asset.mimeType || blob.type || 'application/octet-stream';
  const size = asset.size ?? blob.size;
  if (__DEV__) {
    console.info('[uploadCustomerFile] start', {
      customerId,
      folderId,
      fileName: asset.name,
      contentType,
      size,
    });
  }
  const presign = await apiRequest<{
    fileId: number;
    uploadUrl: string;
    fileUrl: string;
    objectKey: string;
    putHeaders?: Record<string, string>;
  }>('/api/storage/files/presign', {
    method: 'POST',
    token: bearer,
    body: JSON.stringify({
      fileName: asset.name,
      contentType,
      size,
      sizeBytes: size,
      customerId,
    }),
  });
  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, ...(presign.putHeaders ?? {}) },
    body: blob,
  });
  if (!put.ok) {
    await apiRequest('/api/storage/files/upload-fail', {
      method: 'POST',
      token: bearer,
      body: JSON.stringify({ fileId: presign.fileId }),
    }).catch(() => undefined);
    throw new ApiError('파일 업로드에 실패했습니다.', put.status);
  }
  await apiRequest('/api/storage/files', {
    method: 'POST',
    token: bearer,
    body: JSON.stringify({
      fileId: presign.fileId,
      fileName: asset.name,
      displayName: asset.name,
      objectKey: presign.objectKey,
      fileUrl: presign.fileUrl,
      size,
      mimeType: contentType,
      content: '',
      folderId,
      customerId,
    }),
  });
}
