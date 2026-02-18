// main/apps/web/src/features/notifications/index.ts
/**
 * Notifications Feature Module
 *
 * In-app notification bell, dropdown, and data hooks.
 */

export { NotificationBell, NotificationDropdown } from './components';
export type { NotificationBellProps, NotificationDropdownProps } from './components';

export { useNotifications } from './hooks';
export type { UseNotificationsOptions, UseNotificationsResult } from './hooks';

export { createNotificationsApi } from './api';
export type {
  NotificationsApi,
  NotificationsApiConfig,
  NotificationsListResponse,
  MarkReadResponse,
  DeleteNotificationResponse,
} from './api';

export { getNotificationRoute } from './utils';
