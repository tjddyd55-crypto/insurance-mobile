import { ApiError } from '../../api/client';
import type { ConsultationLead, ConsultationLeadList, ConsultationLeadStatus } from './types';

/** 상담 신청 id 는 UUID. 경로·푸시에서 이 형식만 받는다. */
const LEAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeConsultationLeadId(value: unknown): string | null {
  const id = typeof value === 'string' ? value.trim() : '';
  return LEAD_ID.test(id) ? id.toLowerCase() : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function nullableText(value: unknown): string | null {
  const result = text(value).trim();
  return result || null;
}

export function normalizeLeadStatus(value: unknown): ConsultationLeadStatus {
  const raw = text(value).trim().toLowerCase();
  return raw === 'checked' || raw === 'completed' ? raw : 'new';
}

export function normalizeConsultationLead(value: unknown): ConsultationLead {
  if (!value || typeof value !== 'object') throw new ApiError('상담 신청 데이터가 올바르지 않습니다.', 500);
  const row = value as Record<string, unknown>;
  const id = text(row.id).trim();
  if (!id) throw new ApiError('상담 신청 데이터에 id가 없습니다.', 500);
  return {
    id,
    visitorName: text(row.visitorName).trim(),
    phoneNormalized: text(row.phoneNormalized).replace(/\D/g, ''),
    phoneDisplay: text(row.phoneDisplay).trim(),
    message: text(row.message),
    contactChannel: text(row.contactChannel).trim().toLowerCase(),
    privacyConsent: row.privacyConsent === true,
    privacyConsentAt: nullableText(row.privacyConsentAt),
    privacyPolicyVersion: text(row.privacyPolicyVersion),
    status: normalizeLeadStatus(row.status),
    checkedAt: nullableText(row.checkedAt),
    completedAt: nullableText(row.completedAt),
    createdAt: nullableText(row.createdAt),
    updatedAt: nullableText(row.updatedAt),
  };
}

export function normalizeConsultationLeadList(value: unknown): ConsultationLeadList {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  if (!row || !Array.isArray(row.items)) throw new ApiError('상담 신청 목록 응답이 올바르지 않습니다.', 500);
  const items = row.items.map(normalizeConsultationLead);
  const counted = Number(row.newCount);
  return {
    items,
    newCount: Number.isInteger(counted) && counted >= 0 ? counted : countNewLeads(items),
  };
}

export function normalizeConsultationLeadItem(value: unknown): ConsultationLead {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  return normalizeConsultationLead(row?.item);
}

/** 배지 = status 'new' 건수. */
export function countNewLeads(items: Pick<ConsultationLead, 'status'>[]): number {
  return items.filter((item) => item.status === 'new').length;
}

export function consultationLeadStatusLabel(status: ConsultationLeadStatus): string {
  if (status === 'checked') return '확인';
  if (status === 'completed') return '완료';
  return '신규';
}

export function consultationChannelLabel(channel: string): string {
  if (channel === 'phone') return '전화';
  if (channel === 'sms') return '문자';
  if (channel === 'kakao') return '카카오톡';
  return channel || '—';
}

export function leadMessagePreview(message: string, max = 48): string {
  const value = message.replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/** 010-1234-5678 형태(웹 formatKrPhoneNumberForDisplay 와 같은 규칙). */
export function formatLeadPhone(lead: Pick<ConsultationLead, 'phoneDisplay' | 'phoneNormalized'>): string {
  const digits = (lead.phoneNormalized || lead.phoneDisplay).replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return lead.phoneDisplay || digits || '—';
}

export function leadDialUrl(lead: Pick<ConsultationLead, 'phoneNormalized'>, scheme: 'tel' | 'sms' = 'tel'): string | null {
  const digits = lead.phoneNormalized.replace(/\D/g, '');
  return digits.length >= 9 ? `${scheme}:${digits}` : null;
}

/** 다음 상태 버튼: 신규 → 확인 처리, 신규·확인 → 완료 처리. 완료는 더 바꾸지 않는다. */
export function leadStatusActions(status: ConsultationLeadStatus): { check: boolean; complete: boolean } {
  return { check: status === 'new', complete: status !== 'completed' };
}

export function formatLeadDateTime(iso: string | null): string {
  if (!iso) return '—';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}
