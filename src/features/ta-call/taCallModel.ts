import { ApiError } from '../../api/client';
import type {
  TaCallAssignment,
  TaCallDay,
  TaCallSettings,
  TaCallStatus,
  TaCallWeek,
  TaTargetGender,
} from './types';

export const DEFAULT_TA_SETTINGS: TaCallSettings = {
  dailyTargetCount: 10,
  targetGender: 'all',
  targetSangnyeongDays: null,
  targetInsuranceAgeMin: null,
  targetInsuranceAgeMax: null,
  excludeMinors: true,
  updatedAt: null,
};

export const TA_STATUS_LABELS: Record<TaCallStatus, string> = {
  not_called: '미통화', completed: '통화완료', no_answer: '부재중',
};

function object(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new ApiError(`${context}가 올바르지 않습니다.`, 500);
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function nullableText(value: unknown): string | null {
  const result = text(value).trim();
  return result || null;
}

function numberOr(value: unknown, fallback: number): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function optionalInteger(value: unknown): number | null {
  if (value == null || value === '') return null;
  const result = Number(value);
  return Number.isInteger(result) ? result : null;
}

function status(value: unknown): TaCallStatus {
  return value === 'completed' || value === 'no_answer' ? value : 'not_called';
}

export function normalizeTaAssignment(value: unknown): TaCallAssignment {
  const row = object(value, 'TA 배정 데이터');
  const id = text(row.id).trim();
  if (!id) throw new ApiError('TA 배정 데이터에 id가 없습니다.', 500);
  return {
    id,
    customerId: text(row.customerId ?? row.customer_id),
    customerName: text(row.customerName ?? row.customer_name).trim() || '이름 없음',
    customerPhone: text(row.customerPhone ?? row.customer_phone),
    customerBirthDate: nullableText(row.customerBirthDate ?? row.customer_birth_date),
    customerGender: text(row.customerGender ?? row.customer_gender),
    status: status(row.status),
  };
}

export function normalizeTaDay(value: unknown): TaCallDay {
  const row = object(value, 'TA 일별 데이터');
  const assignments = Array.isArray(row.assignments) ? row.assignments.map(normalizeTaAssignment) : [];
  return {
    date: text(row.date),
    dailyTargetCount: numberOr(row.dailyTargetCount ?? row.daily_target_count, 10),
    totalCount: numberOr(row.totalCount ?? row.total_count, assignments.length),
    completedCount: numberOr(row.completedCount ?? row.completed_count, 0),
    noAnswerCount: numberOr(row.noAnswerCount ?? row.no_answer_count, 0),
    notCalledCount: numberOr(row.notCalledCount ?? row.not_called_count, 0),
    isToday: row.isToday === true || row.is_today === true,
    isFuture: row.isFuture === true || row.is_future === true,
    isMissionCompleted: row.isMissionCompleted === true || row.is_mission_completed === true,
    assignments,
    emptyMessage: nullableText(row.emptyMessage ?? row.empty_message),
    emptySubMessage: nullableText(row.emptySubMessage ?? row.empty_sub_message),
  };
}

export function normalizeTaWeek(value: unknown): TaCallWeek {
  const row = object(value, 'TA 주간 데이터');
  return {
    weekStartDate: text(row.weekStartDate ?? row.week_start_date),
    weekEndDate: text(row.weekEndDate ?? row.week_end_date),
    dailyTargetCount: numberOr(row.dailyTargetCount ?? row.daily_target_count, 10),
    targetFilterSummary: nullableText(row.targetFilterSummary ?? row.target_filter_summary),
    days: Array.isArray(row.days) ? row.days.map(normalizeTaDay) : [],
  };
}

function gender(value: unknown): TaTargetGender {
  return value === 'male' || value === 'female' ? value : 'all';
}

export function normalizeTaSettings(value: unknown): TaCallSettings {
  const row = object(value, 'TA 설정 데이터');
  return {
    dailyTargetCount: numberOr(row.dailyTargetCount ?? row.daily_target_count, 10),
    targetGender: gender(row.targetGender ?? row.target_gender),
    targetSangnyeongDays: optionalInteger(row.targetSangnyeongDays ?? row.target_sangnyeong_days),
    targetInsuranceAgeMin: optionalInteger(row.targetInsuranceAgeMin ?? row.target_insurance_age_min),
    targetInsuranceAgeMax: optionalInteger(row.targetInsuranceAgeMax ?? row.target_insurance_age_max),
    excludeMinors: (row.excludeMinors ?? row.exclude_minors) !== false,
    updatedAt: nullableText(row.updatedAt ?? row.updated_at),
  };
}

export function shiftDate(value: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function formatTaDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00+09:00`);
  const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(date);
  return `${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))} ${weekday}`;
}

export function formatTaPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value || '연락처 없음';
}

export function taGenderLabel(value: string): string {
  return value === 'male' || value === 'M' ? '남' : value === 'female' || value === 'F' ? '여' : '미지정';
}

export function taDayStatus(day: TaCallDay): string {
  if (day.isFuture) return '예정';
  if (day.totalCount === 0) return '배정 없음';
  if (day.isMissionCompleted) return '미션 완료';
  if (day.isToday) return '오늘 진행 중';
  return day.completedCount < day.totalCount ? '미완료' : '미션 완료';
}

export function taSettingsSummary(settings: TaCallSettings): string {
  const parts = [`하루 ${settings.dailyTargetCount}명`];
  if (settings.targetGender !== 'all') parts.push(settings.targetGender === 'male' ? '남성' : '여성');
  if (settings.targetSangnyeongDays != null) parts.push(`상령일 ${settings.targetSangnyeongDays}일 이내`);
  if (settings.targetInsuranceAgeMin != null || settings.targetInsuranceAgeMax != null) {
    parts.push(`보험나이 ${settings.targetInsuranceAgeMin ?? 0}~${settings.targetInsuranceAgeMax ?? '제한 없음'}세`);
  }
  if (settings.excludeMinors) parts.push('미성년 제외');
  return parts.join(' · ');
}
