import { ApiError, apiRequest } from '../../api/client';
import {
  normalizeNotificationList,
  normalizeNotificationSettings,
} from './notificationModel';
import type { NotificationListResult, NotificationView, UserAlertSettings } from './types';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function listNotifications(
  token: string | null,
  view: NotificationView,
): Promise<NotificationListResult> {
  const body = await apiRequest<unknown>(`/api/notifications?limit=100&view=${view}&type=all`, {
    token: requireToken(token),
  });
  return normalizeNotificationList(body);
}

async function patchAction(token: string | null, path: string): Promise<void> {
  await apiRequest<unknown>(path, {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify({}),
  });
}

export const markNotificationRead = (token: string | null, id: string) =>
  patchAction(token, `/api/notifications/${encodeURIComponent(id)}/read`);
export const confirmNotification = (token: string | null, id: string) =>
  patchAction(token, `/api/notifications/${encodeURIComponent(id)}/dismiss`);
export const markAllNotificationsRead = (token: string | null) =>
  patchAction(token, '/api/notifications/read-all');

export async function getNotificationSettings(token: string | null): Promise<UserAlertSettings> {
  const body = await apiRequest<unknown>('/api/notifications/settings', { token: requireToken(token) });
  const value = body && typeof body === 'object' && 'data' in body
    ? (body as { data: unknown }).data
    : body;
  return normalizeNotificationSettings(value);
}

export async function saveNotificationSettings(
  token: string | null,
  settings: UserAlertSettings,
): Promise<UserAlertSettings> {
  const body = await apiRequest<unknown>('/api/notifications/settings', {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify(settings),
  });
  const value = body && typeof body === 'object' && 'data' in body
    ? (body as { data: unknown }).data
    : body;
  return normalizeNotificationSettings(value);
}
