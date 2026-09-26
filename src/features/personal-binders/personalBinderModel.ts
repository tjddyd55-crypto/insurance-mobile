import type {
  PersonalBinder,
  PersonalBinderMaterial,
  PersonalBinderSummary,
  PersonalBinderViewerPage,
} from './types';

export type PageRangeParseResult =
  | { ok: true; pages: number[] }
  | { ok: false; error: string };

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export function maxBinderPdfBytes(): number {
  return MAX_PDF_BYTES;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round((bytes || 0) / 1024))}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function binderExportFileName(title: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${base || '내 바인더'}.pdf`;
}

export function formatBinderUpdatedAt(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR');
}

export function normalizeSelectedPages(pages: Iterable<number>, pageCount: number): number[] {
  return [...new Set(pages)]
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= pageCount)
    .sort((left, right) => left - right);
}

export function parsePageRangeInput(input: string, pageCount: number): PageRangeParseResult {
  const source = input.trim();
  if (!source) return { ok: false, error: '페이지 범위를 입력해 주세요.' };
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { ok: false, error: 'PDF 페이지 수를 확인할 수 없습니다.' };
  }

  const pages: number[] = [];
  for (const rawToken of source.split(',')) {
    const parsed = parsePageToken(rawToken, pageCount);
    if (!parsed.ok) return parsed;
    pages.push(...parsed.pages);
  }
  return { ok: true, pages: normalizeSelectedPages(pages, pageCount) };
}

function parsePageToken(
  rawToken: string,
  pageCount: number,
): PageRangeParseResult {
  const token = rawToken.trim();
  if (!token) return { ok: false, error: '빈 페이지 범위가 포함되어 있습니다.' };
  const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(token);
  if (rangeMatch) return parsePageRange(token, rangeMatch, pageCount);
  if (!/^\d+$/.test(token)) {
    return { ok: false, error: `${token} 형식이 올바르지 않습니다.` };
  }
  const page = Number(token);
  if (page < 1 || page > pageCount) {
    return { ok: false, error: `페이지는 1~${pageCount} 사이여야 합니다.` };
  }
  return { ok: true, pages: [page] };
}

function parsePageRange(
  token: string,
  rangeMatch: RegExpExecArray,
  pageCount: number,
): PageRangeParseResult {
  const start = Number(rangeMatch[1]);
  const end = Number(rangeMatch[2]);
  if (start < 1 || end < 1 || start > end) {
    return { ok: false, error: `${token} 범위가 올바르지 않습니다.` };
  }
  if (end > pageCount) {
    return { ok: false, error: `${pageCount}페이지를 초과할 수 없습니다.` };
  }
  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) pages.push(page);
  return { ok: true, pages };
}

export function formatSelectedPages(pages: number[]): string {
  const normalized = [...new Set(pages)].filter(Number.isInteger).sort((left, right) => left - right);
  const first = normalized[0];
  if (first == null) return '';
  const chunks: string[] = [];
  let start = first;
  let previous = first;
  for (const page of normalized.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    chunks.push(start === previous ? String(start) : `${start}-${previous}`);
    start = page;
    previous = page;
  }
  chunks.push(start === previous ? String(start) : `${start}-${previous}`);
  return chunks.join(', ');
}

export function togglePageSelection(selected: number[], page: number): number[] {
  const current = new Set(selected);
  if (current.has(page)) current.delete(page);
  else current.add(page);
  return [...current].sort((left, right) => left - right);
}

export function allPages(pageCount: number): number[] {
  return Array.from({ length: Math.max(0, pageCount) }, (_, index) => index + 1);
}

export function pageSelectionForSave(selected: number[], pageCount: number): number[] | null {
  const normalized = normalizeSelectedPages(selected, pageCount);
  if (normalized.length === pageCount) return null;
  return normalized;
}

export function displayPageSelection(selection: number[] | null, pageCount: number): number[] {
  if (selection == null) return allPages(pageCount);
  return normalizeSelectedPages(selection, pageCount);
}

export function buildBinderViewerPages(binder: PersonalBinder): PersonalBinderViewerPage[] {
  return sortByOrder(binder.sections).flatMap((section) =>
    sortByOrder(section.items).flatMap((item) => {
      const pages = item.pageSelection ?? allPages(item.material.pageCount);
      return pages.map((pdfPageNumber) => ({
        key: `${item.id}:${pdfPageNumber}`,
        sectionId: section.id,
        sectionTitle: section.title,
        itemId: item.id,
        material: item.material,
        pdfPageNumber,
      }));
    }),
  );
}

export function moveRows<T>(rows: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) {
    return rows;
  }
  const next = [...rows];
  const [entry] = next.splice(from, 1);
  if (entry === undefined) return rows;
  next.splice(to, 0, entry);
  return next;
}

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return rows.slice().sort((left, right) => left.sortOrder - right.sortOrder);
}

export function binderSectionTitles(binder: PersonalBinder): { id: string; title: string }[] {
  return sortByOrder(binder.sections).map((section) => ({
    id: section.id,
    title: section.title,
  }));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeBinderMaterial(value: unknown): PersonalBinderMaterial | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== 'string' || !row.id) return null;
  return {
    id: row.id,
    fileId: numberValue(row.fileId),
    title: text(row.title, '자료'),
    originalFileName: text(row.originalFileName),
    mimeType: text(row.mimeType, 'application/pdf'),
    fileSize: numberValue(row.fileSize),
    pageCount: numberValue(row.pageCount),
    checksumSha256: typeof row.checksumSha256 === 'string' ? row.checksumSha256 : null,
    sourceType: row.sourceType === 'official' ? 'official' : 'personal',
    binderCount: row.binderCount == null ? undefined : numberValue(row.binderCount),
    createdAt: text(row.createdAt) || undefined,
    updatedAt: text(row.updatedAt) || undefined,
  };
}

export function normalizeBinderSummary(value: unknown): PersonalBinderSummary | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== 'string' || !row.id) return null;
  return {
    id: row.id,
    title: text(row.title, '바인더'),
    description: text(row.description),
    sectionCount: numberValue(row.sectionCount),
    materialCount: numberValue(row.materialCount),
    pageCount: numberValue(row.pageCount),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
  };
}

export function normalizeBinder(value: unknown): PersonalBinder | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== 'string' || !row.id) return null;
  const sections = Array.isArray(row.sections) ? row.sections : [];
  const binderId = row.id;
  return {
    id: row.id,
    title: text(row.title, '바인더'),
    description: text(row.description),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
    sections: sections.flatMap((section) => {
      const normalized = normalizeSection(section, binderId);
      return normalized ? [normalized] : [];
    }),
  };
}

function normalizeSection(value: unknown, binderId: string) {
  const row = asRecord(value);
  if (!row || typeof row.id !== 'string') return null;
  const items = Array.isArray(row.items) ? row.items : [];
  const sectionId = row.id;
  return {
    id: row.id,
    binderId: text(row.binderId, binderId),
    title: text(row.title, '섹션'),
    sortOrder: numberValue(row.sortOrder),
    createdAt: text(row.createdAt) || undefined,
    updatedAt: text(row.updatedAt) || undefined,
    items: items.flatMap((item) => {
      const normalized = normalizeItem(item, sectionId);
      return normalized ? [normalized] : [];
    }),
  };
}

function normalizeItem(value: unknown, sectionId: string) {
  const row = asRecord(value);
  const material = normalizeBinderMaterial(row?.material);
  if (!row || typeof row.id !== 'string' || !material) return null;
  const selection = Array.isArray(row.pageSelection)
    ? row.pageSelection.map(Number).filter((page) => Number.isInteger(page))
    : null;
  return {
    id: row.id,
    sectionId: text(row.sectionId, sectionId),
    materialId: text(row.materialId, material.id),
    sortOrder: numberValue(row.sortOrder),
    pageSelection: selection,
    material,
    createdAt: text(row.createdAt) || undefined,
    updatedAt: text(row.updatedAt) || undefined,
  };
}

export function normalizeBinderList(value: unknown): PersonalBinderSummary[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const normalized = normalizeBinderSummary(row);
    return normalized ? [normalized] : [];
  });
}

export function normalizeMaterialList(value: unknown): PersonalBinderMaterial[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const normalized = normalizeBinderMaterial(row);
    return normalized ? [normalized] : [];
  });
}

export function isPdfAsset(name: string, mimeType: string | null | undefined): boolean {
  return name.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
}
