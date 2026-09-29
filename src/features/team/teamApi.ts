import { ApiError, apiRequest } from '../../api/client';
import {
  normalizeTeamComment,
  normalizeTeamFile,
  normalizeTeamMembers,
  normalizeTeamPosts,
} from './teamModel';
import type { TeamFile, TeamMembersResult, TeamPostComment, TeamPostsResult } from './types';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function getTeamMembers(token: string | null): Promise<TeamMembersResult> {
  try {
    return normalizeTeamMembers(await apiRequest<unknown>('/api/teams/members', { token: requireToken(token) }));
  } catch (error) {
    if (isMissingTeamError(error)) return emptyTeamMembersResult();
    throw error;
  }
}

function isMissingTeamError(error: unknown): error is ApiError {
  return error instanceof ApiError
    && error.status === 400
    && error.message.includes('팀에 소속되어 있지 않습니다');
}

function emptyTeamMembersResult(): TeamMembersResult {
  return {
    teamId: null,
    teamName: null,
    ownerId: null,
    teamActive: true,
    teamStorageUsedBytes: 0,
    teamStorageLimitBytes: 0,
    members: [],
  };
}

async function post(token: string | null, path: string, body: Record<string, unknown> = {}) {
  return apiRequest<Record<string, unknown>>(path, {
    method: 'POST', token: requireToken(token), body: JSON.stringify(body),
  });
}

export async function createTeam(token: string | null, name: string): Promise<string> {
  const result = await post(token, '/api/teams/create', name.trim() ? { name: name.trim() } : {});
  return String(result.teamId ?? '').trim();
}
export async function joinTeam(token: string | null, teamId: string): Promise<string> {
  const result = await post(token, '/api/teams/join', { teamId: teamId.trim() });
  return String(result.teamId ?? teamId).trim();
}
export const kickTeamMember = (token: string | null, userId: string) => post(token, '/api/teams/kick', { userId });
export const transferTeamLeader = (token: string | null, userId: string) => post(token, '/api/teams/transfer-leader', { userId });
export const leaveTeam = (token: string | null) => post(token, '/api/teams/leave');
export const disbandTeam = (token: string | null) => post(token, '/api/teams/disband');

export async function getTeamPosts(token: string | null): Promise<TeamPostsResult> {
  try {
    return normalizeTeamPosts(await apiRequest<unknown>('/api/teams/posts?page=1&limit=100', { token: requireToken(token) }));
  } catch (error) {
    if (isMissingTeamError(error)) {
      return { teamId: '', ownerId: null, page: 1, limit: 100, hasNext: false, posts: [] };
    }
    throw error;
  }
}

export type TeamPostUpload = { objectKey: string; fileName: string; fileUrl: string };

export async function presignTeamPostAttachment(token: string | null, input: { fileName: string; contentType: string; sizeBytes: number }): Promise<{ uploadUrl: string; objectKey: string; putHeaders: Record<string, string> }> {
  return apiRequest('/api/teams/posts/attachments/presign', {
    method: 'POST', token: requireToken(token), body: JSON.stringify(input),
  });
}

export async function createTeamPost(token: string | null, input: { title: string; content: string; isNotice: boolean; attachments?: TeamPostUpload[] }): Promise<void> {
  await apiRequest('/api/teams/posts', {
    method: 'POST', token: requireToken(token),
    body: JSON.stringify({ ...input, title: input.title.trim(), content: input.content.trim(), attachments: input.attachments ?? [] }),
  });
}

export async function updateTeamPost(token: string | null, postId: string, input: { title: string; content: string; isNotice: boolean }): Promise<void> {
  await apiRequest(`/api/teams/posts/${encodeURIComponent(postId)}`, {
    method: 'PATCH', token: requireToken(token),
    body: JSON.stringify({ ...input, title: input.title.trim(), content: input.content.trim() }),
  });
}

export async function deleteTeamPost(token: string | null, postId: string): Promise<void> {
  await apiRequest(`/api/teams/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    token: requireToken(token),
  });
}

export async function getTeamPostComments(token: string | null, postId: string): Promise<TeamPostComment[]> {
  const result = await apiRequest<{ comments?: unknown[] }>(`/api/teams/posts/${encodeURIComponent(postId)}/comments`, { token: requireToken(token) });
  return Array.isArray(result.comments) ? result.comments.map(normalizeTeamComment) : [];
}

export async function createTeamPostComment(token: string | null, postId: string, content: string): Promise<void> {
  await apiRequest(`/api/teams/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST', token: requireToken(token), body: JSON.stringify({ content: content.trim() }),
  });
}

export async function deleteTeamPostComment(token: string | null, commentId: string): Promise<void> {
  await apiRequest(`/api/teams/post-comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE', token: requireToken(token),
  });
}

export async function getTeamFiles(token: string | null): Promise<TeamFile[]> {
  try {
    const result = await apiRequest<{ files?: unknown[] }>('/api/teams/files', { token: requireToken(token) });
    return Array.isArray(result.files) ? result.files.map(normalizeTeamFile) : [];
  } catch (error) {
    if (isMissingTeamError(error)) return [];
    throw error;
  }
}
