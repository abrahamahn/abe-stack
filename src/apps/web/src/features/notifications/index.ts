// src/apps/web/src/features/notifications/index.ts
/**
 * Notifications Feature Module
 *
 * In-app notification bell, dropdown, and data hooks.
 */

export { NotificationBell } from './components/NotificationBell';
export { NotificationDropdown } from './components/NotificationDropdown';
export { useNotifications } from './hooks/useNotifications';
export { createNotificationsApi } from './api/notificationsApi';
export { getNotificationRoute } from './utils/getNotificationRoute';
export type { NotificationBellProps } from './components/NotificationBell';
export type { NotificationDropdownProps } from './components/NotificationDropdown';
export type { UseNotificationsOptions, UseNotificationsResult } from './hooks/useNotifications';
export type {
  NotificationsApiConfig,
  NotificationsListResponse,
  MarkReadResponse,
  DeleteNotificationResponse,
  NotificationsApi,
} from './api/notificationsApi';
