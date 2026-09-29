import { ApiError, apiRequest, resolveApiUrl } from '../../api/client';
import { shareRemoteFile } from '../files/remoteFileSharing';
import { sha256Hex } from './sha256Hex';
import { binderExportFileName, maxBinderPdfBytes, normalizeBinder, normalizeBinderList, normalizeMaterialList } from './personalBinderModel';
import { personalBinderPaths } from './personalBinderPaths';
import type { PersonalBinder, PersonalBinderMaterial, PersonalBinderSummary } from './types';

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError('로그인이 필요합니다.', 401);
  return value;
}

export async function listPersonalBinders(token: string | null): Promise<PersonalBinderSummary[]> {
  const body = await apiRequest<unknown>(personalBinderPaths.binders, { token: requireToken(token) });
  return normalizeBinderList(body);
}

export async function getPersonalBinder(
  token: string | null,
  binderId: string,
): Promise<PersonalBinder> {
  const body = await apiRequest<unknown>(personalBinderPaths.binder(binderId), {
    token: requireToken(token),
  });
  const binder = normalizeBinder(body);
  if (!binder) throw new ApiError('바인더를 찾을 수 없습니다.', 404);
  return binder;
}

export async function createPersonalBinder(
  token: string | null,
  input: { title: string; description?: string },
): Promise<PersonalBinderSummary> {
  const body = await apiRequest<unknown>(personalBinderPaths.binders, {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify(input),
  });
  const summary = normalizeBinderList([body])[0];
  if (!summary) throw new ApiError('바인더를 만들지 못했습니다.', 500);
  return summary;
}

export async function updatePersonalBinder(
  token: string | null,
  binderId: string,
  input: { title: string; description?: string },
): Promise<PersonalBinder> {
  const body = await apiRequest<unknown>(personalBinderPaths.binder(binderId), {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify(input),
  });
  const binder = normalizeBinder(body);
  if (!binder) throw new ApiError('바인더를 저장하지 못했습니다.', 500);
  return binder;
}

export async function deletePersonalBinder(token: string | null, binderId: string): Promise<void> {
  await apiRequest(personalBinderPaths.binder(binderId), {
    method: 'DELETE',
    token: requireToken(token),
  });
}

export async function duplicatePersonalBinder(
  token: string | null,
  binderId: string,
  title: string,
): Promise<PersonalBinder> {
  const body = await apiRequest<unknown>(personalBinderPaths.duplicate(binderId), {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({ title }),
  });
  const binder = normalizeBinder(body);
  if (!binder) throw new ApiError('바인더를 복제하지 못했습니다.', 500);
  return binder;
}

export async function listPersonalBinderMaterials(
  token: string | null,
): Promise<PersonalBinderMaterial[]> {
  const body = await apiRequest<unknown>(personalBinderPaths.materials, {
    token: requireToken(token),
  });
  return normalizeMaterialList(body);
}

export async function checkDuplicateBinderMaterial(
  token: string | null,
  checksumSha256: string,
): Promise<{ duplicate: boolean; material: PersonalBinderMaterial | null }> {
  const body = await apiRequest<{ duplicate?: boolean; material?: unknown }>(
    personalBinderPaths.materialDuplicateCheck,
    {
      method: 'POST',
      token: requireToken(token),
      body: JSON.stringify({ checksumSha256 }),
    },
  );
  const material = normalizeMaterialList([body.material])[0] ?? null;
  return { duplicate: body.duplicate === true, material };
}

export async function renamePersonalBinderMaterial(
  token: string | null,
  materialId: string,
  title: string,
): Promise<PersonalBinderMaterial> {
  const body = await apiRequest<unknown>(personalBinderPaths.material(materialId), {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify({ title }),
  });
  const material = normalizeMaterialList([body])[0];
  if (!material) throw new ApiError('자료 이름을 변경하지 못했습니다.', 500);
  return material;
}

export async function deletePersonalBinderMaterial(
  token: string | null,
  materialId: string,
): Promise<{ fileId: number }> {
  const body = await apiRequest<{ fileId?: number }>(personalBinderPaths.material(materialId), {
    method: 'DELETE',
    token: requireToken(token),
  });
  return { fileId: Number(body?.fileId) || 0 };
}

export async function deleteStorageFile(token: string | null, fileId: number): Promise<void> {
  if (!fileId) return;
  await apiRequest(`/api/storage/files/${fileId}`, {
    method: 'DELETE',
    token: requireToken(token),
  });
}

export async function createPersonalBinderSection(
  token: string | null,
  binderId: string,
  title: string,
): Promise<void> {
  await apiRequest(personalBinderPaths.sections(binderId), {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify({ title }),
  });
}

export async function renamePersonalBinderSection(
  token: string | null,
  sectionId: string,
  title: string,
): Promise<void> {
  await apiRequest(personalBinderPaths.section(sectionId), {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify({ title }),
  });
}

export async function deletePersonalBinderSection(
  token: string | null,
  sectionId: string,
): Promise<void> {
  await apiRequest(personalBinderPaths.section(sectionId), {
    method: 'DELETE',
    token: requireToken(token),
  });
}

export async function reorderPersonalBinderSections(
  token: string | null,
  binderId: string,
  sectionIds: string[],
): Promise<void> {
  await apiRequest(personalBinderPaths.reorderSections(binderId), {
    method: 'PUT',
    token: requireToken(token),
    body: JSON.stringify({ sectionIds }),
  });
}

export async function addPersonalBinderItem(
  token: string | null,
  sectionId: string,
  input: { materialId: string; pageSelection: number[] | null },
): Promise<void> {
  await apiRequest(personalBinderPaths.sectionItems(sectionId), {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify(input),
  });
}

export async function updatePersonalBinderItemPages(
  token: string | null,
  itemId: string,
  pageSelection: number[] | null,
): Promise<void> {
  await apiRequest(personalBinderPaths.item(itemId), {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify({ pageSelection }),
  });
}

export async function deletePersonalBinderItem(token: string | null, itemId: string): Promise<void> {
  await apiRequest(personalBinderPaths.item(itemId), {
    method: 'DELETE',
    token: requireToken(token),
  });
}

export async function reorderPersonalBinderItems(
  token: string | null,
  sectionId: string,
  itemIds: string[],
): Promise<void> {
  await apiRequest(personalBinderPaths.reorderItems(sectionId), {
    method: 'PUT',
    token: requireToken(token),
    body: JSON.stringify({ itemIds }),
  });
}

type PresignResponse = {
  fileId: number;
  uploadUrl: string;
  fileUrl: string;
  objectKey: string;
  putHeaders?: Record<string, string>;
};

export async function uploadPersonalBinderMaterial(
  token: string | null,
  asset: { uri: string; name: string; size?: number | null },
  title: string,
): Promise<PersonalBinderMaterial> {
  const auth = requireToken(token);
  const response = await fetch(asset.uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 1 || bytes.byteLength > maxBinderPdfBytes()) {
    throw new ApiError('PDF 파일은 25MB 이하여야 합니다.', 400);
  }
  const checksum = await sha256Hex(bytes);
  const duplicate = await checkDuplicateBinderMaterial(auth, checksum);
  if (duplicate.duplicate) {
    throw new ApiError('이미 자료 보관함에 등록된 PDF입니다.', 409);
  }
  const presign = await apiRequest<PresignResponse>('/api/storage/files/presign', {
    method: 'POST',
    token: auth,
    body: JSON.stringify({
      fileName: asset.name,
      contentType: 'application/pdf',
      size: asset.size ?? bytes.byteLength,
      customerId: null,
    }),
  });
  const uploaded = await putPdf(presign, bytes);
  if (!uploaded) {
    await apiRequest('/api/storage/files/upload-fail', {
      method: 'POST',
      token: auth,
      body: JSON.stringify({ fileId: presign.fileId }),
    }).catch(() => undefined);
    throw new ApiError('PDF 업로드에 실패했습니다.', 400);
  }
  const saved = await apiRequest<{ id?: number }>('/api/storage/files', {
    method: 'POST',
    token: auth,
    body: JSON.stringify({
      fileId: presign.fileId,
      fileName: asset.name,
      displayName: asset.name,
      objectKey: presign.objectKey,
      fileUrl: presign.fileUrl,
      size: asset.size ?? bytes.byteLength,
      mimeType: 'application/pdf',
      content: '',
      folderId: null,
      customerId: null,
    }),
  });
  const fileId = Number(saved.id ?? presign.fileId);
  const material = await apiRequest<unknown>(personalBinderPaths.materials, {
    method: 'POST',
    token: auth,
    body: JSON.stringify({ fileId, title: title.trim() }),
  });
  const normalized = normalizeMaterialList([material])[0];
  if (!normalized) throw new ApiError('자료를 등록하지 못했습니다.', 500);
  return normalized;
}

async function putPdf(presign: PresignResponse, bytes: Uint8Array): Promise<boolean> {
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf', ...(presign.putHeaders ?? {}) },
    body,
  });
  return put.ok;
}

export async function sharePersonalBinderPdf(
  token: string | null,
  binderId: string,
  title: string,
): Promise<void> {
  const auth = requireToken(token);
  await shareRemoteFile({
    url: resolveApiUrl(personalBinderPaths.exportPdf(binderId)),
    fileName: binderExportFileName(title),
    mimeType: 'application/pdf',
    headers: { Authorization: `Bearer ${auth}` },
    timeoutMs: 120_000,
  });
}
