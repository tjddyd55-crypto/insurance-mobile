import type { DocumentPickerAsset } from 'expo-document-picker';

import { ApiError } from '../../api/client';
import { presignTeamPostAttachment, type TeamPostUpload } from './teamApi';

const CDN_BASE = 'https://cdn.platform-assets.com';

export const TEAM_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'] as const;

export function attachmentContentType(asset: Pick<DocumentPickerAsset, 'name' | 'mimeType'>): string {
  if (asset.mimeType && TEAM_ATTACHMENT_TYPES.includes(asset.mimeType as (typeof TEAM_ATTACHMENT_TYPES)[number])) return asset.mimeType;
  const name = asset.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  throw new ApiError('이미지 또는 PDF 파일만 첨부할 수 있습니다.', 400);
}

export function cdnUrlForObjectKey(objectKey: string): string {
  const normalized = objectKey.trim().replace(/^\//, '').replace(/^platform-assets\//, '');
  return normalized ? `${CDN_BASE}/${normalized}` : '';
}

export async function uploadTeamPostAttachments(token: string | null, assets: DocumentPickerAsset[]): Promise<TeamPostUpload[]> {
  if (assets.length > 10) throw new ApiError('첨부파일은 최대 10개까지 등록할 수 있습니다.', 400);
  const uploaded: TeamPostUpload[] = [];
  for (const asset of assets) {
    const contentType = attachmentContentType(asset);
    const blob = await fetch(asset.uri).then((response) => response.blob());
    const sizeBytes = asset.size ?? blob.size;
    const presign = await presignTeamPostAttachment(token, { fileName: asset.name, contentType, sizeBytes });
    const response = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, ...(presign.putHeaders ?? {}) },
      body: blob,
    });
    if (!response.ok) throw new ApiError('파일 업로드에 실패했습니다.', response.status);
    uploaded.push({ objectKey: presign.objectKey, fileName: asset.name, fileUrl: cdnUrlForObjectKey(presign.objectKey) });
  }
  return uploaded;
}
