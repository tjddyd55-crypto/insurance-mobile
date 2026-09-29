import { ApiError, apiRequest } from '../../api/client';
import { normalizeTaSettings, normalizeTaWeek } from './taCallModel';
import type { TaCallSettings, TaCallStatus, TaCallWeek } from './types';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function getTaSettings(token: string | null): Promise<TaCallSettings> {
  return normalizeTaSettings(await apiRequest<unknown>('/api/ta/settings', { token: requireToken(token) }));
}

export async function saveTaSettings(token: string | null, settings: TaCallSettings): Promise<TaCallSettings> {
  const body = await apiRequest<unknown>('/api/ta/settings', {
    method: 'PATCH', token: requireToken(token),
    body: JSON.stringify({
      dailyTargetCount: settings.dailyTargetCount,
      targetGender: settings.targetGender,
      targetSangnyeongDays: settings.targetSangnyeongDays,
      targetInsuranceAgeMin: settings.targetInsuranceAgeMin,
      targetInsuranceAgeMax: settings.targetInsuranceAgeMax,
      excludeMinors: settings.excludeMinors,
    }),
  });
  return normalizeTaSettings(body);
}

export async function getTaWeek(token: string | null, startDate?: string): Promise<TaCallWeek> {
  const query = startDate ? `?startDate=${encodeURIComponent(startDate)}` : '';
  return normalizeTaWeek(await apiRequest<unknown>(`/api/ta/week${query}`, { token: requireToken(token) }));
}

export async function setTaAssignmentStatus(
  token: string | null, assignmentId: string, status: TaCallStatus,
): Promise<void> {
  await apiRequest<unknown>(`/api/ta/assignments/${encodeURIComponent(assignmentId)}/status`, {
    method: 'PATCH', token: requireToken(token), body: JSON.stringify({ status }),
  });
}
