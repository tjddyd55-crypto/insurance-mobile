import { ApiError, apiRequest } from '../../api/client';
import { normalizeProfile } from './profileModel';
import type { ProfileRecord } from './types';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function getProfile(token: string | null): Promise<ProfileRecord> {
  return normalizeProfile(await apiRequest<unknown>('/api/me', { token: requireToken(token) }));
}

export async function saveProfile(
  token: string | null,
  body: { displayName: string; phoneNumber?: string; phoneChangeProof?: string },
): Promise<ProfileRecord> {
  return normalizeProfile(await apiRequest<unknown>('/api/me', {
    method: 'PATCH', token: requireToken(token),
    body: JSON.stringify({
      display_name: body.displayName.trim(),
      ...(body.phoneNumber ? { phone_number: body.phoneNumber.replace(/\D/g, '') } : {}),
      ...(body.phoneChangeProof ? { phone_change_proof: body.phoneChangeProof } : {}),
    }),
  }));
}

export async function sendPhoneChangeCode(token: string | null, phoneNumber: string) {
  return apiRequest<{ ok?: boolean; message?: string; debugCode?: string }>(
    '/api/me/send-phone-change-code',
    {
      method: 'POST', token: requireToken(token),
      body: JSON.stringify({ phone_number: phoneNumber.replace(/\D/g, '') }),
    },
  );
}

export async function verifyPhoneChangeCode(
  token: string | null, phoneNumber: string, code: string,
): Promise<{ proof: string }> {
  const body = await apiRequest<unknown>('/api/me/verify-phone-change-code', {
    method: 'POST', token: requireToken(token),
    body: JSON.stringify({ phone_number: phoneNumber.replace(/\D/g, ''), code: code.trim() }),
  });
  const row = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const proof = String(row.phone_change_proof ?? '').trim();
  if (!proof) throw new ApiError('휴대폰 인증 결과가 올바르지 않습니다.', 500);
  return { proof };
}
