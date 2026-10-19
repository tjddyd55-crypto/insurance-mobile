import { ApiError } from '../../api/client';
import { displayPageSelection, formatSelectedPages } from '../personal-binders/personalBinderModel';

export type SharedBinderSummary = {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  sectionCount: number;
  fileCount: number;
  totalBytes: number;
  createdAt: string | null;
  status: string;
};

export type SharedBinderItem = {
  id: string;
  shareFileId: string;
  sortOrder: number;
  pageSelection: number[] | null;
  material: { title: string; originalFileName: string; mimeType: string; fileSize: number; pageCount: number };
};

export type SharedBinderSection = { id: string; title: string; sortOrder: number; items: SharedBinderItem[] };

export type SharedBinderDetail = SharedBinderSummary & { sections: SharedBinderSection[] };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}
function idText(value: unknown): string {
  return text(value).trim();
}
function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function normalizeSharedBinderSummary(value: unknown): SharedBinderSummary | null {
  const row = record(value);
  const id = idText(row?.id);
  if (!row || !id) return null;
  return {
    id,
    title: text(row.title).trim() || '공유 바인더',
    description: text(row.description),
    ownerName: text(row.ownerName).trim() || text(row.ownerUserId).trim(),
    sectionCount: count(row.sectionCount),
    fileCount: count(row.fileCount),
    totalBytes: count(row.totalBytes),
    createdAt: text(row.createdAt).trim() || null,
    status: text(row.status),
  };
}

export function normalizeSharedBinderList(value: unknown): SharedBinderSummary[] {
  if (!Array.isArray(value)) throw new ApiError('공유 바인더 목록 응답이 올바르지 않습니다.', 500);
  return value.flatMap((row) => {
    const normalized = normalizeSharedBinderSummary(row);
    return normalized ? [normalized] : [];
  });
}

function normalizePageSelection(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const pages = value.map(Number).filter((page) => Number.isInteger(page) && page > 0);
  return pages.length > 0 ? pages : null;
}

function normalizeItem(value: unknown): SharedBinderItem | null {
  const row = record(value);
  const id = idText(row?.id);
  if (!row || !id) return null;
  const material = record(row.material) ?? {};
  return {
    id,
    shareFileId: idText(row.shareFileId),
    sortOrder: Number(row.sortOrder) || 0,
    pageSelection: normalizePageSelection(row.pageSelection),
    material: {
      title: text(material.title).trim() || text(material.originalFileName).trim() || '자료',
      originalFileName: text(material.originalFileName).trim(),
      mimeType: text(material.mimeType).trim(),
      fileSize: count(material.fileSize),
      pageCount: count(material.pageCount),
    },
  };
}

export function normalizeSharedBinderDetail(value: unknown): SharedBinderDetail {
  const summary = normalizeSharedBinderSummary(value);
  const row = record(value);
  if (!summary || !row) throw new ApiError('공유 바인더를 읽지 못했습니다.', 500);
  const sections = (Array.isArray(row.sections) ? row.sections : [])
    .flatMap((section): SharedBinderSection[] => {
      const item = record(section);
      const id = idText(item?.id);
      if (!item || !id) return [];
      const items = (Array.isArray(item.items) ? item.items : [])
        .flatMap((child) => {
          const normalized = normalizeItem(child);
          return normalized ? [normalized] : [];
        })
        .sort((left, right) => left.sortOrder - right.sortOrder);
      return [{ id, title: text(item.title).trim() || '섹션', sortOrder: Number(item.sortOrder) || 0, items }];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
  return { ...summary, sections };
}

/** 내 바인더와 같은 규칙(displayPageSelection·formatSelectedPages)으로 선택 페이지를 보인다. */
export function sharedItemPageLabel(item: Pick<SharedBinderItem, 'pageSelection' | 'material'>): string {
  const total = item.material.pageCount;
  if (item.pageSelection == null) return total > 0 ? `전체 ${total}쪽` : '전체';
  const pages = total > 0 ? displayPageSelection(item.pageSelection, total) : item.pageSelection;
  return pages.length > 0 ? `${formatSelectedPages(pages)}쪽 (${pages.length}쪽)` : '선택한 페이지 없음';
}

export function sharedBinderPageTotal(detail: Pick<SharedBinderDetail, 'sections'>): number {
  return detail.sections.reduce(
    (sum, section) =>
      sum +
      section.items.reduce((inner, item) => {
        const total = item.material.pageCount;
        if (item.pageSelection == null) return inner + total;
        return inner + (total > 0 ? displayPageSelection(item.pageSelection, total).length : item.pageSelection.length);
      }, 0),
    0,
  );
}

export function newImportIdempotencyKey(shareId: string, now = Date.now()): string {
  return `import:${shareId}:${now}`;
}

export type BinderShareStatus = { active: { shareId: string; title: string; createdAt: string | null } | null };

/** GET /api/personal-binders/:binderId/share-status → { active: { shareId, title, createdAt, status } | null } */
export function normalizeBinderShareStatus(body: unknown): BinderShareStatus {
  const active = record(record(body)?.active);
  const shareId = idText(active?.shareId);
  if (!active || !shareId || (active.status != null && text(active.status) !== 'active')) return { active: null };
  return { active: { shareId, title: text(active.title), createdAt: active.createdAt == null ? null : text(active.createdAt) } };
}
