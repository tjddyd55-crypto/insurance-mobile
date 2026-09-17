import { ApiError, apiRequest } from '../../api/client';
import type { LocalAttachment, NewsAttachment } from './types';

/** Web SSOT: customer-news/all broadcast attachments use storage API (no customerId). */
export async function uploadAllNewsAttachment(
  token: string,
  asset: LocalAttachment,
): Promise<Omit<NewsAttachment, 'id'>> {
  const blob = await fetch(asset.uri).then((response) => response.blob());
  const contentType = asset.mimeType || blob.type || 'application/octet-stream';
  const size = asset.size ?? blob.size;

  const presign = await apiRequest<{
    fileId: number;
    uploadUrl: string;
    fileUrl: string;
    objectKey: string;
    putHeaders?: Record<string, string>;
  }>('/api/storage/files/presign', {
    method: 'POST',
    token,
    body: JSON.stringify({
      fileName: asset.name,
      contentType,
      size,
      customerId: null,
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
      token,
      body: JSON.stringify({ fileId: presign.fileId }),
    }).catch(() => undefined);
    throw new ApiError('첨부파일 업로드에 실패했습니다.', put.status);
  }

  await apiRequest('/api/storage/files', {
    method: 'POST',
    token,
    body: JSON.stringify({
      fileId: presign.fileId,
      fileName: asset.name,
      displayName: asset.name,
      objectKey: presign.objectKey,
      fileUrl: presign.fileUrl,
      size,
      mimeType: contentType,
      content: 'customer-news/all',
      folderId: null,
      customerId: null,
    }),
  });

  return {
    kind: asset.kind,
    url: presign.fileUrl,
    objectKey: presign.objectKey,
    fileName: asset.name,
    mimeType: contentType,
    size,
    sortOrder: 0,
  };
}
