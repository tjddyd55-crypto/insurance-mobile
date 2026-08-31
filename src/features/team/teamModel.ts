import { ApiError } from '../../api/client';
import type {
  TeamFile,
  TeamMember,
  TeamMembersResult,
  TeamPost,
  TeamPostComment,
  TeamPostsResult,
} from './types';

function nullableText(value: unknown): string | null {
  const result = value == null ? '' : String(value).trim();
  return result || null;
}

export function normalizeTeamMember(value: unknown): TeamMember {
  if (!value || typeof value !== 'object') throw new ApiError('팀원 데이터가 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  const userId = String(row.userId ?? row.user_id ?? '').trim();
  if (!userId) throw new ApiError('팀원 데이터에 사용자 id가 없습니다.', 500);
  return {
    userId,
    username: String(row.username ?? ''),
    displayName: String(row.displayName ?? row.display_name ?? '').trim(),
    role: String(row.role ?? ''),
    teamId: nullableText(row.teamId ?? row.team_id),
  };
}

export function normalizeTeamMembers(value: unknown): TeamMembersResult {
  if (!value || typeof value !== 'object') throw new ApiError('팀원 목록 응답이 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  return {
    teamId: nullableText(row.teamId ?? row.team_id),
    teamName: nullableText(row.teamName ?? row.team_name),
    ownerId: nullableText(row.ownerId ?? row.owner_id),
    teamActive: row.teamActive !== false && row.team_active !== false,
    teamStorageUsedBytes: Number(row.teamStorageUsedBytes ?? row.team_storage_used_bytes) || 0,
    teamStorageLimitBytes: Number(row.teamStorageLimitBytes ?? row.team_storage_limit_bytes) || 0,
    members: Array.isArray(row.members) ? row.members.map(normalizeTeamMember) : [],
  };
}

export function formatStorageBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function requiredId(row: Record<string, unknown>, label: string): string {
  const id = String(row.id ?? '').trim();
  if (!id) throw new ApiError(`${label} 데이터에 id가 없습니다.`, 500);
  return id;
}

export function normalizeTeamPost(value: unknown): TeamPost {
  if (!value || typeof value !== 'object') throw new ApiError('팀 게시글 데이터가 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  return {
    id: requiredId(row, '팀 게시글'),
    title: String(row.title ?? '').trim(),
    content: String(row.content ?? ''),
    isNotice: Boolean(row.isNotice ?? row.is_notice),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    authorId: String(row.authorId ?? row.author_id ?? ''),
    authorUsername: String(row.authorUsername ?? row.author_username ?? ''),
    authorDisplayName: String(row.authorDisplayName ?? row.author_display_name ?? '').trim(),
    attachments: Array.isArray(row.attachments) ? row.attachments.map((item) => {
      const attachment = item as Record<string, unknown>;
      return {
        id: String(attachment.id ?? attachment.fileUrl ?? attachment.file_url ?? ''),
        fileUrl: String(attachment.fileUrl ?? attachment.file_url ?? ''),
        fileName: String(attachment.fileName ?? attachment.file_name ?? '첨부파일'),
      };
    }) : [],
  };
}

export function normalizeTeamPosts(value: unknown): TeamPostsResult {
  if (!value || typeof value !== 'object') throw new ApiError('팀 게시판 응답이 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  return {
    teamId: String(row.teamId ?? row.team_id ?? ''),
    ownerId: nullableText(row.ownerId ?? row.owner_id),
    page: Number(row.page) || 1,
    limit: Number(row.limit) || 20,
    hasNext: Boolean(row.hasNext ?? row.has_next),
    posts: Array.isArray(row.posts) ? row.posts.map(normalizeTeamPost) : [],
  };
}

export function normalizeTeamComment(value: unknown): TeamPostComment {
  if (!value || typeof value !== 'object') throw new ApiError('댓글 데이터가 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  return {
    id: requiredId(row, '댓글'),
    postId: String(row.postId ?? row.post_id ?? ''),
    content: String(row.content ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    authorId: String(row.authorId ?? row.author_id ?? ''),
    authorUsername: String(row.authorUsername ?? row.author_username ?? ''),
    authorDisplayName: String(row.authorDisplayName ?? row.author_display_name ?? '').trim(),
  };
}

export function normalizeTeamFile(value: unknown): TeamFile {
  if (!value || typeof value !== 'object') throw new ApiError('팀 자료 데이터가 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  return {
    id: requiredId(row, '팀 자료'),
    fileUrl: String(row.fileUrl ?? row.file_url ?? ''),
    fileName: String(row.fileName ?? row.file_name ?? '첨부파일'),
    postId: String(row.postId ?? row.post_id ?? ''),
    postTitle: String(row.postTitle ?? row.post_title ?? ''),
    postCreatedAt: String(row.postCreatedAt ?? row.post_created_at ?? ''),
  };
}

export function formatTeamDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value || '—';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(timestamp));
}

export function teamAuthorLabel(value: { authorDisplayName: string; authorUsername: string }): string {
  return value.authorDisplayName.trim() || value.authorUsername.trim() || '알 수 없음';
}

export function canEditTeamPost(post: TeamPost, userId: string | undefined, ownerId: string | null, role: string | undefined): boolean {
  if (!userId) return false;
  return post.authorId === userId || ownerId === userId || role === 'SUPER_ADMIN' || role === 'GA_ADMIN';
}
