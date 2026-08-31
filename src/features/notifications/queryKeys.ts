import type { NotificationView } from './types';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: (view: NotificationView) => ['notifications', 'list', view] as const,
  settings: ['notifications', 'settings'] as const,
};
