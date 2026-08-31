import { ApiError } from '../../api/client';
import type {
  CustomerGender,
  CustomerNotesBag,
  CustomerRecord,
  ListCustomersResult,
} from './types';

export const EMPTY_CUSTOMER_NOTES: CustomerNotesBag = {
  items: [],
  insuranceHistory: '',
  accountNumber: '',
  treatmentHistoryNote: '',
  medicationHistoryNote: '',
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function nullableText(value: unknown): string | null {
  const normalized = text(value).trim();
  return normalized || null;
}

function normalizeGender(value: unknown): CustomerGender {
  return value === 'male' || value === 'female' ? value : null;
}

export function normalizeCustomerNotes(value: unknown): CustomerNotesBag {
  if (Array.isArray(value)) {
    return { ...EMPTY_CUSTOMER_NOTES, items: value as CustomerNotesBag['items'] };
  }
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_CUSTOMER_NOTES };
  }
  const row = value as Record<string, unknown>;
  return {
    items: Array.isArray(row.items) ? (row.items as CustomerNotesBag['items']) : [],
    insuranceHistory: text(row.insuranceHistory),
    accountNumber: text(row.accountNumber),
    treatmentHistoryNote: text(row.treatmentHistoryNote),
    medicationHistoryNote: text(row.medicationHistoryNote),
  };
}

export function normalizeCustomer(value: unknown, context = '고객 데이터'): CustomerRecord {
  if (!value || typeof value !== 'object') {
    throw new ApiError(`${context}가 올바르지 않습니다.`, 500);
  }
  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(`${context}에 유효한 id가 없습니다.`, 500);
  }
  const phone = text(row.phone || row.phoneNumber || row.phone_number).trim();
  const insuranceAge = Number(row.insuranceAge ?? row.insurance_age);

  return {
    id,
    userId: text(row.userId ?? row.user_id),
    name: text(row.name).trim() || '이름 없음',
    customerCode: nullableText(row.customerCode ?? row.customer_code),
    ssn: text(row.ssn),
    gender: normalizeGender(row.gender),
    insuranceAge: Number.isFinite(insuranceAge) ? insuranceAge : null,
    birthDate: nullableText(row.birthDate ?? row.birth_date),
    nextAgeDate: nullableText(row.nextAgeDate ?? row.next_age_date),
    isDriver: typeof row.isDriver === 'boolean' ? row.isDriver : null,
    carType: text(row.carType ?? row.car_type),
    notes: normalizeCustomerNotes(row.notes),
    phone,
    phoneNumber: phone,
    carrier: text(row.carrier),
    address: text(row.address),
    height: text(row.height),
    weight: text(row.weight),
    job: text(row.job),
    driving: text(row.driving),
    medical: text(row.medical),
    carNumber: text(row.carNumber ?? row.car_number),
    carModel: text(row.carModel ?? row.car_model),
    carYear: text(row.carYear ?? row.car_year),
    renewalDate: text(row.renewalDate ?? row.renewal_date),
    lastConsultDate: nullableText(row.lastConsultDate ?? row.last_consult_date),
    lastConsultationAt: nullableText(row.lastConsultationAt ?? row.last_consultation_at),
    lastConsultationMemo: nullableText(row.lastConsultationMemo ?? row.last_consultation_memo),
    lastConsultationSummary: nullableText(
      row.lastConsultationSummary ?? row.last_consultation_summary,
    ),
    consultationCount: Number.isFinite(Number(row.consultationCount))
      ? Number(row.consultationCount)
      : undefined,
    hasConsultation: row.hasConsultation === true,
    inflowSource: nullableText(row.inflowSource ?? row.inflow_source),
    referrerName: nullableText(row.referrerName ?? row.referrer_name),
    nextContactDate: nullableText(row.nextContactDate ?? row.next_contact_date),
    followUpStatus: nullableText(row.followUpStatus ?? row.follow_up_status),
    contactResult: nullableText(row.contactResult ?? row.contact_result),
    followUpNotePreview: nullableText(row.followUpNotePreview ?? row.follow_up_note_preview),
    overdueFollowUp: row.overdueFollowUp === true,
    todayFollowUp: row.todayFollowUp === true,
    isFavorite: row.isFavorite === true || row.is_favorite === true,
    smsOptOut: row.smsOptOut === true || row.sms_opt_out === true,
    createdAt: text(row.createdAt ?? row.created_at),
  };
}

export function normalizeCustomerListResponse(value: unknown): ListCustomersResult {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)
      ? ((value as { data: unknown[] }).data)
      : null;
  if (!rows) {
    throw new ApiError('고객 목록 응답 구조가 올바르지 않습니다.', 500);
  }
  const customers = rows.map((row, index) => normalizeCustomer(row, `고객 목록 ${index + 1}번째 항목`));
  const totalRaw = !Array.isArray(value) && value && typeof value === 'object'
    ? Number((value as { total?: unknown }).total)
    : Number.NaN;
  return { customers, total: Number.isFinite(totalRaw) ? totalRaw : customers.length };
}

export function formatCustomerPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export function customerGenderLabel(gender: CustomerGender): string {
  return gender === 'male' ? '남' : gender === 'female' ? '여' : '성별 미지정';
}

export function customerMatchesSearch(customer: CustomerRecord, keyword: string): boolean {
  const needle = keyword.trim().toLocaleLowerCase('ko-KR').replace(/\s/g, '');
  if (!needle) {
    return true;
  }
  const values = [
    customer.name,
    customer.phone,
    customer.customerCode,
    customer.address,
    customer.referrerName,
    customer.lastConsultationMemo,
    customer.lastConsultationSummary,
  ];
  return values.some((value) =>
    text(value).toLocaleLowerCase('ko-KR').replace(/\s/g, '').includes(needle),
  );
}
