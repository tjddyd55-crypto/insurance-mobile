import { ApiError } from '../../api/client';
import { formatDeviceLocalYmd } from '../../utils/deviceLocalDate';
import type {
  NotificationListResult,
  NotificationRecord,
  NotificationType,
  UserAlertSettings,
} from './types';

export const DEFAULT_ALERT_SETTINGS: UserAlertSettings = {
  appPush: { enabled: true },
  newCustomer: { enabled: true },
  customerAppFile: { enabled: true },
  workAlert: { enabled: true },
  insuranceAge: { enabled: true, daysBefore: 30 },
  carExpiry: { enabled: true, daysBefore: 30 },
  specialDate: { enabled: true, daysBefore: 0 },
  claimRequest: { enabled: true },
};

export const NOTIFICATION_PANEL_PREVIEW_COUNT = 5;

export const NOTIFICATION_SECTIONS: { type: NotificationType; title: string; dateLabel: string }[] = [
  { type: 'customer_created', title: '신규 고객', dateLabel: '등록일' },
  { type: 'newsletter_published', title: '소식지', dateLabel: '게시일' },
  { type: 'claim_request_received', title: '청구요청', dateLabel: '접수일' },
  { type: 'insurance_age_date', title: '상령일', dateLabel: '상령일' },
  { type: 'car_expiry', title: '자동차만기', dateLabel: '만기일' },
  { type: 'special_date', title: '알림일', dateLabel: '알림일' },
  { type: 'advisor_consultation_lead', title: '상담 신청', dateLabel: '신청일' },
  { type: 'other', title: '알림', dateLabel: '기준일' },
];

/** 항목이 있을 때만 섹션을 보인다(빈 섹션을 새로 늘리지 않는다). */
const SECTIONS_SHOWN_ONLY_WHEN_PRESENT = new Set<NotificationType>(['advisor_consultation_lead', 'other']);

/** created_at 을 기준일로 쓰는 type. */
const CREATED_AT_REFERENCE_TYPES = new Set<NotificationType>([
  'claim_request_received',
  'customer_created',
  'advisor_consultation_lead',
  'other',
]);

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
    raw === 'special_date' ||
    raw === 'customer_created' ||
    raw === 'newsletter_published' ||
    raw === 'advisor_consultation_lead'
  ) {
    return raw;
  }
  // 모르는 type 하나 때문에 목록 전체가 실패하지 않게 일반 알림으로 보인다.
  return 'other';
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
    rawType: text(row.type),
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

function normalizeToggle(value: unknown, fallback: { enabled: boolean }) {
  if (!value || typeof value !== 'object') return { ...fallback };
  const row = value as Record<string, unknown>;
  return { enabled: row.enabled !== false };
}

export function normalizeNotificationSettings(value: unknown): UserAlertSettings {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    appPush: normalizeToggle(row.appPush ?? row.app_push, DEFAULT_ALERT_SETTINGS.appPush),
    newCustomer: normalizeToggle(row.newCustomer ?? row.new_customer, DEFAULT_ALERT_SETTINGS.newCustomer),
    customerAppFile: normalizeToggle(
      row.customerAppFile ?? row.customer_app_file,
      DEFAULT_ALERT_SETTINGS.customerAppFile,
    ),
    workAlert: normalizeToggle(row.workAlert ?? row.work_alert, DEFAULT_ALERT_SETTINGS.workAlert),
    insuranceAge: normalizeWindowed(row.insuranceAge ?? row.insurance_age, DEFAULT_ALERT_SETTINGS.insuranceAge),
    carExpiry: normalizeWindowed(row.carExpiry ?? row.car_expiry, DEFAULT_ALERT_SETTINGS.carExpiry),
    specialDate: normalizeWindowed(row.specialDate ?? row.special_date, DEFAULT_ALERT_SETTINGS.specialDate),
    claimRequest: normalizeToggle(row.claimRequest ?? row.claim_request, DEFAULT_ALERT_SETTINGS.claimRequest),
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
    // 깨진 항목(객체 아님·id 없음)은 그 항목만 건너뛴다. 목록 실패(재시도 화면)는 API 응답 자체가 잘못됐을 때만.
    notifications: row.notifications.flatMap((item, index) => {
      try {
        return [normalizeNotification(item, `알림 목록 ${index + 1}번째 항목`)];
      } catch {
        return [];
      }
    }),
    settings: normalizeNotificationSettings(row.settings),
  };
}

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_SECTIONS.find((section) => section.type === type)?.title ?? '알림';
}

function dateOnly(value: string | null): string | null {
  return formatDeviceLocalYmd(value);
}

export function notificationReferenceDate(
  row: Pick<NotificationRecord, 'targetDate' | 'createdAt' | 'type'>,
): string | null {
  return (
    dateOnly(row.targetDate) ??
    (CREATED_AT_REFERENCE_TYPES.has(row.type) ? dateOnly(row.createdAt) : null)
  );
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
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function groupNotifications(rows: NotificationRecord[]) {
  return NOTIFICATION_SECTIONS.filter(
    (section) => !SECTIONS_SHOWN_ONLY_WHEN_PRESENT.has(section.type) || rows.some((row) => row.type === section.type),
  ).map((section) => ({
    ...section,
    data: rows
      .filter((row) => row.type === section.type)
      .sort((a, b) =>
        (notificationReferenceDate(a) ?? '').localeCompare(notificationReferenceDate(b) ?? ''),
      ),
  }));
}

/** 이 알림을 눌렀을 때 Native 에서 갈 곳이 있는지. 없으면 탭은 아무 동작도 하지 않는다. */
export function notificationHasTarget(
  row: Pick<NotificationRecord, 'type' | 'customerId' | 'referenceId'>,
): boolean {
  if (row.type === 'other' || row.type === 'advisor_consultation_lead') return false;
  if (row.type === 'newsletter_published') return Boolean(String(row.referenceId ?? '').trim());
  return row.customerId != null && row.customerId > 0;
}

/** 카드 제목. 고객 기반 알림은 고객 이름, 상담 신청·모르는 type 은 저장된 문구의 종류 이름. */
export function notificationTitle(row: Pick<NotificationRecord, 'type' | 'customerName'>): string {
  if (row.type === 'other') return '알림';
  if (row.type === 'advisor_consultation_lead') return '상담 신청';
  return row.customerName || '고객 정보 없음';
}
