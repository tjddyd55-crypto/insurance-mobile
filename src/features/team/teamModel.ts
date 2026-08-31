import { ApiError } from '../../api/client';
import type { TeamMember, TeamMembersResult } from './types';

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
