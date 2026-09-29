import type {
  StorageFile,
  StorageFolder,
  StorageQuota,
  StorageUsageBreakdown,
  StorageUsageSummary,
} from './types';
export function normalizeStorageFolder(value: unknown): StorageFolder | null { if (!value || typeof value !== 'object') return null; const row = value as Record<string, unknown>; const id = Number(row.id); const name = String(row.name ?? '').trim(); if (!Number.isFinite(id) || !name) return null; return { id, name, parentId: row.parentId == null && row.parent_id == null ? null : Number(row.parentId ?? row.parent_id), createdAt: String(row.createdAt ?? row.created_at ?? '') }; }
export function normalizeStorageFile(value: unknown): StorageFile | null { if (!value || typeof value !== 'object') return null; const row = value as Record<string, unknown>; const id = Number(row.id); if (!Number.isFinite(id)) return null; return { id, folderId: row.folderId == null && row.folder_id == null ? null : Number(row.folderId ?? row.folder_id), displayName: String(row.displayName ?? row.display_name ?? row.originalName ?? row.original_name ?? row.fileName ?? row.file_name ?? '파일'), fileName: String(row.fileName ?? row.file_name ?? ''), fileUrl: String(row.fileUrl ?? row.file_url ?? ''), fileSize: Number(row.fileSize ?? row.file_size) || 0, mimeType: row.mimeType == null && row.mime_type == null ? null : String(row.mimeType ?? row.mime_type), createdAt: String(row.createdAt ?? row.created_at ?? '') }; }
export function normalizeStorageQuota(value: unknown): StorageQuota { const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { usedBytes: Number(row.usedBytes ?? row.used_bytes) || 0, limitBytes: Number(row.limitBytes ?? row.limit_bytes) || 0, pendingUploadBytes: Number(row.pendingUploadBytes ?? row.pending_upload_bytes) || 0 }; }
export function formatStorageSize(value: number): string { if (value < 1024) return `${value} B`; if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`; if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`; return `${(value / 1024 ** 3).toFixed(1)} GB`; }

export function formatStorageDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function calculateStorageUsageRatio(usedBytes: number, limitBytes: number): number {
  if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes) || limitBytes <= 0) return 0;
  return Math.min(1, Math.max(0, usedBytes / limitBytes));
}

export function formatStorageFileType(mimeType: string | null): string {
  if (!mimeType) return '파일';
  if (mimeType.startsWith('image/')) return '이미지';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '스프레드시트';
  if (mimeType.includes('word') || mimeType.startsWith('text/')) return '문서';
  return '파일';
}

function normalizeUsageSummary(value: unknown): StorageUsageSummary | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const label = String(row.label ?? '').trim();
  if (!label) return null;
  return {
    source: String(row.source ?? ''),
    label,
    count: Math.max(0, Number(row.count) || 0),
    size: Math.max(0, Number(row.size) || 0),
  };
}

export function normalizeStorageUsageBreakdown(value: unknown): StorageUsageBreakdown {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const summary = Array.isArray(row.summary)
    ? row.summary.map(normalizeUsageSummary).filter((item): item is StorageUsageSummary => Boolean(item))
    : [];
  return {
    summary,
    totalCount: Math.max(0, Number(row.totalCount ?? row.total_count) || 0),
    totalSize: Math.max(0, Number(row.totalSize ?? row.total_size) || 0),
  };
}
