import type {
  CustomerNewsItem,
  CustomerNewsPreviewDraft,
  DraftAttachment,
  LocalAttachment,
  NewsAttachment,
} from './types';
import { isFileAttachment, isImageAttachment } from './customerNewsModel';

export type CustomerNewsBodySegment = 'gallery' | 'content' | 'files';
export type CustomerNewsCarouselMode = 'none' | 'single' | 'multi';

export function customerNewsCarouselMode(urlCount: number): CustomerNewsCarouselMode {
  if (urlCount <= 0) {
    return 'none';
  }
  if (urlCount === 1) {
    return 'single';
  }
  return 'multi';
}

export function resolveCustomerNewsBodySegments(params: {
  galleryUrlCount: number;
  content: string;
  fileCount: number;
}): CustomerNewsBodySegment[] {
  const segments: CustomerNewsBodySegment[] = [];
  if (params.galleryUrlCount > 0) {
    segments.push('gallery');
  }
  if (params.content.trim()) {
    segments.push('content');
  }
  if (params.fileCount > 0) {
    segments.push('files');
  }
  return segments;
}

export function buildCustomerNewsGalleryUrls(params: {
  heroImageUrl?: string | null;
  attachments?: NewsAttachment[] | null;
}): string[] {
  const hero = String(params.heroImageUrl ?? '').trim();
  const rows = [...(params.attachments ?? [])]
    .filter(isImageAttachment)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fromAttachments = rows
    .map((row) => String(row.url ?? '').trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    out.push(url);
  };

  if (hero && !fromAttachments.includes(hero)) {
    push(hero);
  }
  for (const url of fromAttachments) {
    push(url);
  }
  if (out.length === 0 && hero) {
    push(hero);
  }
  return out;
}

export function galleryUrlsFromDrafts(drafts: DraftAttachment[]): string[] {
  return drafts
    .filter((row) => row.kind === 'image')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => String(row.localUri ?? row.url ?? '').trim())
    .filter(Boolean);
}

export function fileDraftsFromDrafts(drafts: DraftAttachment[]): DraftAttachment[] {
  return drafts
    .filter((row) => row.kind === 'file')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function findImageAttachmentByUrl(
  attachments: NewsAttachment[] | undefined,
  url: string,
): NewsAttachment | undefined {
  const target = String(url ?? '').trim();
  return (attachments ?? []).find(
    (row) => isImageAttachment(row) && String(row.url ?? '').trim() === target,
  );
}

export function hydrateDraftAttachmentsFromItem(item: CustomerNewsItem): DraftAttachment[] {
  const galleryUrls = buildCustomerNewsGalleryUrls({
    heroImageUrl: item.heroImageUrl,
    attachments: item.attachments,
  });
  const hero = String(item.heroImageUrl ?? '').trim();

  const imageDrafts: DraftAttachment[] = galleryUrls.map((url, index) => {
    const row = findImageAttachmentByUrl(item.attachments, url);
    return {
      key: row?.id ?? (url === hero ? `hero-${index}` : `image-${index}`),
      kind: 'image',
      fileName: row?.fileName ?? `image-${index + 1}`,
      mimeType: row?.mimeType,
      size: row?.size,
      sortOrder: index,
      url,
      objectKey: row?.objectKey,
      id: row?.id,
    };
  });

  const fileDrafts: DraftAttachment[] = (item.attachments ?? [])
    .filter(isFileAttachment)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row, index) => ({
      key: row.id ?? `file-${index}`,
      kind: 'file',
      fileName: row.fileName,
      mimeType: row.mimeType,
      size: row.size,
      sortOrder: row.sortOrder,
      url: row.url,
      objectKey: row.objectKey,
      id: row.id,
    }));

  return [...imageDrafts, ...fileDrafts];
}

export function draftAttachmentsToPreviewRows(drafts: DraftAttachment[]): NewsAttachment[] {
  return [...drafts]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row, index) => ({
      id: row.id,
      kind: row.kind,
      url: String(row.localUri ?? row.url ?? ''),
      fileName: row.fileName,
      mimeType: row.mimeType,
      size: row.size,
      objectKey: row.objectKey,
      sortOrder: index,
    }))
    .filter((row) => Boolean(row.url));
}

export function localAttachmentToDraft(
  asset: LocalAttachment,
  sortOrder: number,
): DraftAttachment {
  return {
    key: `local-${Date.now()}-${sortOrder}`,
    kind: asset.kind,
    fileName: asset.name,
    mimeType: asset.mimeType ?? undefined,
    size: asset.size ?? undefined,
    sortOrder,
    localUri: asset.uri,
  };
}

export function nextDraftSortOrder(drafts: DraftAttachment[]): number {
  if (!drafts.length) {
    return 0;
  }
  return Math.max(...drafts.map((row) => row.sortOrder)) + 1;
}

export function canPublishCustomerNews(content: string, drafts: DraftAttachment[]): boolean {
  return Boolean(content.trim()) || drafts.length > 0;
}

export function publishValidationMessage(content: string, drafts: DraftAttachment[]): string | null {
  if (canPublishCustomerNews(content, drafts)) {
    return null;
  }
  return '내용 또는 첨부파일을 입력해 주세요.';
}

export function previewValidationMessage(content: string, drafts: DraftAttachment[]): string | null {
  if (canPublishCustomerNews(content, drafts)) {
    return null;
  }
  return '미리보기 전에 내용 또는 첨부파일을 추가해 주세요.';
}

export async function serializeDraftAttachmentsForSubmit(
  drafts: DraftAttachment[],
  uploadLocal: (asset: LocalAttachment) => Promise<Omit<NewsAttachment, 'id'>>,
): Promise<Omit<NewsAttachment, 'id'>[]> {
  const sorted = [...drafts].sort((a, b) => a.sortOrder - b.sortOrder);
  const uploaded: Omit<NewsAttachment, 'id'>[] = [];
  for (const [index, draft] of sorted.entries()) {
    if (draft.localUri) {
      const asset: LocalAttachment = {
        uri: draft.localUri,
        name: draft.fileName,
        mimeType: draft.mimeType,
        size: draft.size,
        kind: draft.kind,
      };
      const row = await uploadLocal(asset);
      uploaded.push({ ...row, sortOrder: index });
      continue;
    }
    if (!draft.url) {
      continue;
    }
    uploaded.push({
      kind: draft.kind,
      url: draft.url,
      objectKey: draft.objectKey,
      fileName: draft.fileName,
      mimeType: draft.mimeType,
      size: draft.size,
      sortOrder: index,
    });
  }
  return uploaded;
}

export function buildCreateCustomerNewsPayload(params: {
  content: string;
  scope: 'all' | 'personal';
  targetCustomerId: number | null;
  sendPush: boolean;
  isPinned: boolean;
  attachments: Omit<NewsAttachment, 'id'>[];
}) {
  return {
    content: params.content.trim(),
    scope: params.scope,
    targetCustomerId: params.scope === 'personal' ? params.targetCustomerId : null,
    sendPush: params.sendPush,
    isPinned: params.isPinned,
    attachments: params.attachments,
  };
}

export function buildUpdateCustomerNewsPayload(params: {
  content: string;
  sendPush: boolean;
  attachments: Omit<NewsAttachment, 'id'>[];
}) {
  return {
    content: params.content.trim(),
    sendPush: params.sendPush,
    attachments: params.attachments,
  };
}

export function buildPreviewDraftFromForm(params: {
  content: string;
  attachments: DraftAttachment[];
  isPinned: boolean;
}): CustomerNewsPreviewDraft {
  return {
    content: params.content,
    attachments: draftAttachmentsToPreviewRows(params.attachments),
    isPinned: params.isPinned,
  };
}

export function listCardPreviewText(item: CustomerNewsItem): string {
  const content = String(item.content ?? '').trim();
  if (content) {
    return content;
  }
  const imageCount = buildCustomerNewsGalleryUrls({
    heroImageUrl: item.heroImageUrl,
    attachments: item.attachments,
  }).length;
  const fileCount = (item.attachments ?? []).filter(isFileAttachment).length;
  if (imageCount && fileCount) {
    return `이미지 ${imageCount}장 · 파일 ${fileCount}개`;
  }
  if (imageCount) {
    return `이미지 ${imageCount}장`;
  }
  if (fileCount) {
    return `첨부파일 ${fileCount}개`;
  }
  return '내용 없음';
}
