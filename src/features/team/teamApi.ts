import { ApiError, apiRequest } from '../../api/client';
import { normalizeTeamMembers } from './teamModel';
import type { TeamMembersResult } from './types';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function getTeamMembers(token: string | null): Promise<TeamMembersResult> {
  return normalizeTeamMembers(await apiRequest<unknown>('/api/teams/members', { token: requireToken(token) }));
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
