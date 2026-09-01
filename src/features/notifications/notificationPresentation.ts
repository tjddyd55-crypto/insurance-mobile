import type { BadgeTone } from '../../design-system';
import { NOTIFICATION_SECTIONS } from './notificationModel';
import type { NotificationType } from './types';

export function notificationSectionTone(type: NotificationType): BadgeTone {
  if (type === 'insurance_age_date') return 'success';
  if (type === 'car_expiry') return 'info';
  if (type === 'claim_request_received') return 'warning';
  return 'default';
}

export function notificationSectionDateLabel(type: NotificationType): string {
  return NOTIFICATION_SECTIONS.find((section) => section.type === type)?.dateLabel ?? '기준일';
}

export function notificationEmptyCopy(): string {
  return '표시할 알림이 없습니다.';
}
