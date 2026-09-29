import type { FeatureRequest, FeatureRequestComment, FeatureRequestStatus } from './types';

export function normalizeFeatureRequest(value: unknown): FeatureRequest | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = Number(row.id); const status = String(row.status ?? 'pending') as FeatureRequestStatus;
  if (!Number.isFinite(id) || !['pending', 'reviewed', 'done'].includes(status)) return null;
  return { id, title: String(row.title ?? '').trim(), content: String(row.content ?? ''), status, createdAt: String(row.createdAt ?? row.created_at ?? ''), commentCount: Math.max(0, Number(row.commentCount ?? row.comment_count) || 0) };
}
export function normalizeFeatureRequestComment(value: unknown): FeatureRequestComment | null {
  if (!value || typeof value !== 'object') return null; const row = value as Record<string, unknown>; const id = Number(row.id); if (!Number.isFinite(id)) return null;
  return { id, authorRole: String(row.authorRole ?? row.author_role ?? ''), authorUsername: row.authorUsername == null && row.author_username == null ? null : String(row.authorUsername ?? row.author_username), authorDisplayName: row.authorDisplayName == null && row.author_display_name == null ? null : String(row.authorDisplayName ?? row.author_display_name), authorGaName: row.authorGaName == null && row.author_ga_name == null ? null : String(row.authorGaName ?? row.author_ga_name), authorId: String(row.authorId ?? row.author_id ?? ''), createdAt: String(row.createdAt ?? row.created_at ?? ''), content: String(row.content ?? '') };
}
export function featureRequestStatusLabel(status: FeatureRequestStatus): string { return status === 'done' ? '완료' : status === 'reviewed' ? '검토됨' : '대기'; }
export function featureRequestCommentAuthor(comment: FeatureRequestComment): string { if (comment.authorRole === 'admin') return comment.authorDisplayName?.trim() || comment.authorUsername?.trim() || '담당자'; return comment.authorDisplayName?.trim() || comment.authorUsername?.trim() || comment.authorGaName?.trim() || '사용자'; }
export function formatFeatureRequestDate(value: string): string { const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(timestamp)) : value || '—'; }
