import { ApiError, apiRequest } from '../../api/client';

export type SignupPhonePolicy = {
  devBypassEnabled: boolean;
  signupPhoneVerificationRequired: boolean;
};

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function validateUsername(value: string): string | null {
  const username = value.trim();
  if (username.length < 3 || username.length > 30 || /\s/.test(username)) {
    return '아이디는 공백 없이 3~30자로 입력해 주세요.';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  return value.length < 4 || value.length > 100 ? '비밀번호는 4~100자여야 합니다.' : null;
}

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  if (validateUsername(username)) return false;
  const body = await apiRequest<{ available?: boolean }>(
    `/api/auth/username-availability?username=${encodeURIComponent(username.trim())}`,
  );
  return body.available === true;
}

export async function getSignupPhonePolicy(): Promise<SignupPhonePolicy> {
  const body = await apiRequest<Partial<SignupPhonePolicy>>('/api/auth/signup-phone-policy');
  return {
    devBypassEnabled: body.devBypassEnabled === true,
    signupPhoneVerificationRequired: body.signupPhoneVerificationRequired !== false,
  };
}

export async function validateGaCode(code: string): Promise<{ success: boolean; gaName?: string }> {
  if (!code.trim()) return { success: false };
  return apiRequest<{ success: boolean; gaName?: string }>(
    `/api/ga/validate?code=${encodeURIComponent(code.trim().toUpperCase())}`,
  );
}

export async function sendSignupPhoneCode(body: { phoneNumber: string; inviteCode?: string }) {
  return apiRequest<{ ok?: boolean; message?: string; debugCode?: string }>(
    '/api/auth/send-signup-phone-code',
    {
      method: 'POST',
      body: JSON.stringify({
        phone_number: normalizePhone(body.phoneNumber),
        ...(body.inviteCode?.trim() ? { invite_code: body.inviteCode.trim().toUpperCase() } : {}),
      }),
    },
  );
}

export async function verifySignupPhoneCode(body: {
  phoneNumber: string;
  inviteCode?: string;
  code: string;
}): Promise<{ proof: string }> {
  const raw = await apiRequest<unknown>('/api/auth/verify-signup-phone-code', {
    method: 'POST',
    body: JSON.stringify({
      phone_number: normalizePhone(body.phoneNumber),
      code: body.code.trim(),
      ...(body.inviteCode?.trim() ? { invite_code: body.inviteCode.trim().toUpperCase() } : {}),
    }),
  });
  const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const nested = row.data && typeof row.data === 'object' ? row.data as Record<string, unknown> : {};
  const proof = String(row.signup_phone_proof ?? nested.signup_phone_proof ?? '').trim();
  if (!proof) throw new ApiError('휴대폰 인증 결과가 올바르지 않습니다.', 500);
  return { proof };
}

export async function registerAccount(body: {
  username: string;
  password: string;
  name: string;
  inviteCode?: string;
  phoneNumber?: string;
  signupPhoneProof?: string;
  referralCode?: string;
}): Promise<void> {
  await apiRequest<unknown>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: body.username.trim(),
      password: body.password,
      name: body.name.trim(),
      phone_number: normalizePhone(body.phoneNumber ?? ''),
      ...(body.inviteCode?.trim() ? { invite_code: body.inviteCode.trim().toUpperCase() } : {}),
      ...(body.signupPhoneProof?.trim() ? { signup_phone_proof: body.signupPhoneProof.trim() } : {}),
      ...(body.referralCode?.trim() ? { referral_code: body.referralCode.trim().toUpperCase().replace(/\s/g, '') } : {}),
    }),
  });
}

export async function requestPasswordResetCode(username: string, phoneNumber: string) {
  return apiRequest<{ ok?: boolean; message?: string; debugCode?: string; retryAfterSec?: number }>(
    '/api/auth/request-password-reset-code',
    {
      method: 'POST',
      body: JSON.stringify({ username: username.trim(), phoneNumber: normalizePhone(phoneNumber) }),
    },
  );
}

export async function resetPasswordBySms(body: {
  username: string;
  phoneNumber: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  await apiRequest<unknown>('/api/auth/reset-password-by-sms', {
    method: 'POST',
    body: JSON.stringify({
      username: body.username.trim(),
      phoneNumber: normalizePhone(body.phoneNumber),
      code: body.code.trim(),
      newPassword: body.newPassword,
    }),
  });
}
