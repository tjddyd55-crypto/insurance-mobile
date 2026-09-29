import { Image } from 'react-native';

import { ApiError, apiRequest } from '../../api/client';
import { personalBinderPaths } from './personalBinderPaths';

/** 전체 페이지는 기기 픽셀에 맞춰 이 두 폭만 요청한다. 썸네일은 preset=thumb(240). */
export const FULL_PAGE_IMAGE_WIDTHS = [1080, 1440] as const;
const LINK_REFRESH_SKEW_MS = 20_000;

export type BinderViewerPageRef = {
  index: number;
  sectionId: string;
  sectionTitle: string;
  itemId: string;
  materialId: string;
  fileId: number;
  mimeType: string;
  kind: 'pdf' | 'image';
  pdfPageNumber: number;
};

export type BinderViewerPageList = {
  binderId: string;
  title: string;
  pageCount: number;
  pages: BinderViewerPageRef[];
};

export type PageImageLink = {
  openUrl: string;
  expiresAt: string;
  width: number;
};

export type PageImageRequest =
  | { scope: 'binder'; binderId: string; index: number; width: number }
  | { scope: 'binder-thumb'; binderId: string; index: number }
  | { scope: 'material-thumb'; materialId: string; page: number };

const linkCache = new Map<string, PageImageLink>();

export function fullPageImageWidth(devicePixelWidth: number): (typeof FULL_PAGE_IMAGE_WIDTHS)[number] {
  if (!Number.isFinite(devicePixelWidth) || devicePixelWidth <= 1260) return 1080;
  return 1440;
}

export function isPageImageLinkFresh(expiresAt: string, now = Date.now()): boolean {
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires - LINK_REFRESH_SKEW_MS > now;
}

export function pageImageRequestKey(request: PageImageRequest): string {
  if (request.scope === 'material-thumb') return `material:${request.materialId}:${request.page}:thumb`;
  if (request.scope === 'binder-thumb') return `binder:${request.binderId}:${request.index}:thumb`;
  return `binder:${request.binderId}:${request.index}:w${request.width}`;
}

export function readCachedPageImageLink(key: string, now = Date.now()): PageImageLink | null {
  const link = linkCache.get(key);
  if (!link || !isPageImageLinkFresh(link.expiresAt, now)) {
    linkCache.delete(key);
    return null;
  }
  return link;
}

export function rememberPageImageLink(key: string, link: PageImageLink): void {
  linkCache.set(key, link);
}

export function forgetPageImageLink(key: string): void {
  linkCache.delete(key);
}

export function binderSectionJumps(pages: BinderViewerPageRef[]): { sectionId: string; title: string; position: number }[] {
  const jumps: { sectionId: string; title: string; position: number }[] = [];
  const seen = new Set<string>();
  pages.forEach((page, position) => {
    if (seen.has(page.sectionId)) return;
    seen.add(page.sectionId);
    jumps.push({ sectionId: page.sectionId, title: page.sectionTitle || '섹션', position });
  });
  return jumps;
}

export function normalizeBinderViewerPages(value: unknown): BinderViewerPageList {
  const row = asRecord(value);
  if (!row) throw new ApiError('페이지 목록을 읽지 못했습니다.', 500);
  const pages = (Array.isArray(row.pages) ? row.pages : [])
    .flatMap((page) => {
      const normalized = normalizeViewerPage(page);
      return normalized ? [normalized] : [];
    })
    .sort((left, right) => left.index - right.index);
  return {
    binderId: idText(row.binderId),
    title: text(row.title, '상담 책자'),
    pageCount: positiveInt(row.pageCount) || pages.length,
    pages,
  };
}

export async function fetchBinderViewerPages(token: string | null, binderId: string): Promise<BinderViewerPageList> {
  const body = await apiRequest<unknown>(personalBinderPaths.binderPages(binderId), { token });
  return normalizeBinderViewerPages(body);
}

export async function fetchPageImageLink(token: string | null, request: PageImageRequest): Promise<PageImageLink> {
  const key = pageImageRequestKey(request);
  const cached = readCachedPageImageLink(key);
  if (cached) return cached;
  const body = await apiRequest<unknown>(pageImagePath(request), { token });
  const link = normalizePageImageLink(body);
  rememberPageImageLink(key, link);
  return link;
}

export async function prefetchBinderPageLinks(
  token: string | null,
  binderId: string,
  indexes: number[],
  width: number,
): Promise<void> {
  await Promise.all(indexes.map(async (index) => {
    if (index < 1) return;
    try {
      const link = await fetchPageImageLink(token, { scope: 'binder', binderId, index, width });
      await Image.prefetch(link.openUrl);
    } catch {
      // 옆 페이지 미리받기는 현재 페이지 표시를 막지 않는다.
    }
  }));
}

function pageImagePath(request: PageImageRequest): string {
  if (request.scope === 'material-thumb') {
    return `${personalBinderPaths.materialPage(request.materialId, request.page)}?preset=thumb`;
  }
  if (request.scope === 'binder-thumb') {
    return `${personalBinderPaths.binderPage(request.binderId, request.index)}?preset=thumb`;
  }
  return `${personalBinderPaths.binderPage(request.binderId, request.index)}?width=${request.width}`;
}

function normalizeViewerPage(value: unknown): BinderViewerPageRef | null {
  const row = asRecord(value);
  const index = positiveInt(row?.index);
  if (!row || index < 1) return null;
  const kind = row.kind === 'image' ? 'image' : 'pdf';
  return {
    index,
    sectionId: idText(row.sectionId),
    sectionTitle: text(row.sectionTitle, '섹션'),
    itemId: idText(row.itemId),
    materialId: idText(row.materialId),
    fileId: positiveInt(row.fileId),
    mimeType: text(row.mimeType, 'application/pdf'),
    kind,
    pdfPageNumber: positiveInt(row.pdfPageNumber) || index,
  };
}

function normalizePageImageLink(value: unknown): PageImageLink {
  const row = asRecord(value);
  const openUrl = text(row?.openUrl);
  if (!row || (!openUrl.startsWith('https://') && !openUrl.startsWith('http://'))) {
    throw new ApiError('페이지 이미지 주소를 읽지 못했습니다.', 500);
  }
  return {
    openUrl,
    expiresAt: text(row.expiresAt),
    width: positiveInt(row.width),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function idText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function positiveInt(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}
