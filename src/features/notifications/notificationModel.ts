import { ApiError } from '../../api/client';
import type {
  NotificationListResult,
  NotificationRecord,
  NotificationType,
  UserAlertSettings,
} from './types';

export const DEFAULT_ALERT_SETTINGS: UserAlertSettings = {
  insuranceAge: { enabled: true, daysBefore: 30 },
  carExpiry: { enabled: true, daysBefore: 30 },
  specialDate: { enabled: true, daysBefore: 30 },
  claimRequest: { enabled: true },
};

export const NOTIFICATION_SECTIONS: { type: NotificationType; title: string; dateLabel: string }[] = [
  { type: 'insurance_age_date', title: '상령일', dateLabel: '상령일' },
  { type: 'car_expiry', title: '자동차만기', dateLabel: '만기일' },
  { type: 'special_date', title: '지정일', dateLabel: '지정일' },
  { type: 'claim_request_received', title: '청구요청', dateLabel: '접수일' },
];

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function nullableText(value: unknown): string | null {
  const result = text(value).trim();
  return result || null;
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function notificationType(value: unknown): NotificationType {
  const raw = text(value);
  if (
    raw === 'car_expiry' ||
    raw === 'insurance_age_date' ||
    raw === 'claim_request_received' ||
    raw === 'special_date'
  ) return raw;
  throw new ApiError('지원하지 않는 알림 유형입니다.', 500);
}

export function normalizeNotification(value: unknown, context = '알림 데이터'): NotificationRecord {
  if (!value || typeof value !== 'object') throw new ApiError(`${context}가 올바르지 않습니다.`, 500);
  const row = value as Record<string, unknown>;
  const id = text(row.id).trim();
  if (!id) throw new ApiError(`${context}에 유효한 id가 없습니다.`, 500);
  return {
    id,
    userId: text(row.userId ?? row.user_id),
    gaId: nullableNumber(row.gaId ?? row.ga_id),
    teamId: nullableText(row.teamId ?? row.team_id),
    type: notificationType(row.type),
    referenceId: nullableText(row.referenceId ?? row.reference_id),
    message: text(row.message),
    isRead: row.isRead === true || row.is_read === true,
    isDismissed: row.isDismissed === true || row.is_dismissed === true,
    customerId: nullableNumber(row.customerId ?? row.customer_id),
    customerName: nullableText(row.customerName ?? row.customer_name),
    targetDate: nullableText(row.targetDate ?? row.target_date)?.slice(0, 10) ?? null,
    claimRequestId: nullableNumber(row.claimRequestId ?? row.claim_request_id),
    specialDateId: nullableNumber(row.specialDateId ?? row.special_date_id),
    createdAt: nullableText(row.createdAt ?? row.created_at),
    confirmedAt: nullableText(row.confirmedAt ?? row.confirmed_at),
  };
}

function normalizeWindowed(value: unknown, fallback: { enabled: boolean; daysBefore: number }) {
  if (!value || typeof value !== 'object') return { ...fallback };
  const row = value as Record<string, unknown>;
  const days = Number(row.daysBefore ?? row.days_before);
  return {
    enabled: row.enabled !== false,
    daysBefore: Number.isInteger(days) && days >= 0 && days <= 365 ? days : fallback.daysBefore,
  };
}

export function normalizeNotificationSettings(value: unknown): UserAlertSettings {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    insuranceAge: normalizeWindowed(row.insuranceAge ?? row.insurance_age, DEFAULT_ALERT_SETTINGS.insuranceAge),
    carExpiry: normalizeWindowed(row.carExpiry ?? row.car_expiry, DEFAULT_ALERT_SETTINGS.carExpiry),
    specialDate: normalizeWindowed(row.specialDate ?? row.special_date, DEFAULT_ALERT_SETTINGS.specialDate),
    claimRequest: {
      enabled:
        row.claimRequest && typeof row.claimRequest === 'object'
          ? (row.claimRequest as { enabled?: unknown }).enabled !== false
          : DEFAULT_ALERT_SETTINGS.claimRequest.enabled,
    },
  };
}

export function normalizeNotificationList(value: unknown): NotificationListResult {
  if (!value || typeof value !== 'object') {
    throw new ApiError('알림 목록 응답 구조가 올바르지 않습니다.', 500);
  }
  const row = value as Record<string, unknown>;
  if (!Array.isArray(row.notifications)) {
    throw new ApiError('알림 목록 응답 구조가 올바르지 않습니다.', 500);
  }
  return {
    notifications: row.notifications.map((item, index) =>
      normalizeNotification(item, `알림 목록 ${index + 1}번째 항목`),
    ),
    settings: normalizeNotificationSettings(row.settings),
  };
}

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_SECTIONS.find((section) => section.type === type)?.title ?? '알림';
}

function dateOnly(value: string | null): string | null {
  const result = value?.slice(0, 10) ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

export function notificationReferenceDate(row: Pick<NotificationRecord, 'targetDate' | 'createdAt' | 'type'>): string | null {
  return dateOnly(row.targetDate) ?? (row.type === 'claim_request_received' ? dateOnly(row.createdAt) : null);
}

function utcDay(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function notificationDDay(referenceDate: string | null, today: string): string {
  const target = dateOnly(referenceDate);
  const base = dateOnly(today);
  if (!target || !base) return '—';
  const difference = Math.round((utcDay(target) - utcDay(base)) / 86_400_000);
  return difference === 0 ? 'D-Day' : difference > 0 ? `D-${difference}` : `D+${Math.abs(difference)}`;
}

export function todayInSeoul(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function groupNotifications(rows: NotificationRecord[]) {
  return NOTIFICATION_SECTIONS.map((section) => ({
    ...section,
    data: rows
      .filter((row) => row.type === section.type)
      .sort((a, b) => (notificationReferenceDate(a) ?? '').localeCompare(notificationReferenceDate(b) ?? '')),
  }));
}
