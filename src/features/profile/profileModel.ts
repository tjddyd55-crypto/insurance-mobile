import { ApiError } from '../../api/client';
import type { ProfileRecord } from './types';

export function normalizeProfile(value: unknown): ProfileRecord {
  if (!value || typeof value !== 'object') throw new ApiError('내정보 응답이 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? '').trim();
  if (!id) throw new ApiError('내정보 응답에 id가 없습니다.', 500);
  return {
    id,
    username: String(row.username ?? ''),
    displayName: String(row.display_name ?? row.displayName ?? '').trim(),
    phoneNumber: String(row.phone_number ?? row.phoneNumber ?? '').replace(/\D/g, ''),
    role: String(row.role ?? ''),
    gaId: Number.isFinite(Number(row.ga_id ?? row.gaId)) ? Number(row.ga_id ?? row.gaId) : null,
    status: String(row.status ?? ''),
    teamId: String(row.team_id ?? row.teamId ?? '').trim() || null,
  };
}

export function formatProfilePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
}

export function validateProfilePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return /^01\d{8,9}$/.test(digits) ? null : '유효한 휴대폰 번호를 입력해 주세요.';
}
