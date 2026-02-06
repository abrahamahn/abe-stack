// backend/db/src/repositories/notifications/notifications.test.ts
/**
 * Tests for Notifications Repository
 *
 * Validates in-app notification operations including creation, retrieval,
 * read status tracking, and deletion of user notifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createNotificationRepository } from './notifications';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockNotification = {
  id: 'notif-123',
  user_id: 'usr-123',
  type: 'info',
  title: 'Test Notification',
  message: 'This is a test notification',
  data: { action: 'test' },
  is_read: false,
  read_at: null,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createNotificationRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new notification', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
        data: { action: 'test' },
      });

      expect(result.userId).toBe('usr-123');
      expect(result.type).toBe('info');
      expect(result.title).toBe('Test Notification');
      expect(result.message).toBe('This is a test notification');
      expect(result.isRead).toBe(false);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createNotificationRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification',
        }),
      ).rejects.toThrow('Failed to create notification');
    });

    it('should handle optional data field', async () => {
      const notificationWithoutData = {
        ...mockNotification,
        data: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(notificationWithoutData);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
      });

      expect(result.data).toBeNull();
    });

    it('should default is_read to false', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
      });

      expect(result.isRead).toBe(false);
      expect(result.readAt).toBeNull();
    });

    it('should handle different notification types', async () => {
      const types = ['info', 'warning', 'error', 'success'];

      for (const type of types) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockNotification,
          type,
        });

        const repo = createNotificationRepository(mockDb);
        const result = await repo.create({
          userId: 'usr-123',
          type,
          title: 'Test Notification',
          message: 'This is a test notification',
        });

        expect(result.type).toBe(type);
      }
    });
  });

  describe('findById', () => {
    it('should return notification when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findById('notif-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('notif-123');
      expect(result?.userId).toBe('usr-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findById('notif-nonexistent');

      expect(result).toBeNull();
    });

    it('should handle read notifications', async () => {
      const readNotification = {
        ...mockNotification,
        is_read: true,
        read_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(readNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findById('notif-123');

      expect(result?.isRead).toBe(true);
      expect(result?.readAt).toEqual(new Date('2024-01-02'));
    });
  });

  describe('findByUserId', () => {
    it('should return array of notifications for user', async () => {
      const notifications = [
        mockNotification,
        { ...mockNotification, id: 'notif-456', title: 'Second Notification' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(notifications);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('usr-123');
      expect(result[1].userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no notifications', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findByUserId('usr-new');

      expect(result).toEqual([]);
    });

    it('should apply default pagination parameters', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockNotification]);

      const repo = createNotificationRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/LIMIT 50 OFFSET 0/),
          values: expect.arrayContaining(['usr-123']),
        }),
      );
    });

    it('should respect custom pagination parameters', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockNotification]);

      const repo = createNotificationRepository(mockDb);
      await repo.findByUserId('usr-123', 10, 20);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/LIMIT 10 OFFSET 20/),
          values: expect.arrayContaining(['usr-123']),
        }),
      );
    });

    it('should order by created_at descending', async () => {
      const notifications = [
        { ...mockNotification, id: 'notif-new', created_at: new Date('2024-01-03') },
        { ...mockNotification, id: 'notif-old', created_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(notifications);

      const repo = createNotificationRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*DESC/s),
        }),
      );
    });

    it('should include both read and unread notifications', async () => {
      const notifications = [
        mockNotification,
        { ...mockNotification, id: 'notif-456', is_read: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(notifications);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result.some((n) => n.isRead)).toBe(true);
      expect(result.some((n) => !n.isRead)).toBe(true);
    });
  });

  describe('countUnread', () => {
    it('should return count of unread notifications', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '5' });

      const repo = createNotificationRepository(mockDb);
      const result = await repo.countUnread('usr-123');

      expect(result).toBe(5);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/COUNT/),
        }),
      );
    });

    it('should return zero when user has no unread notifications', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const repo = createNotificationRepository(mockDb);
      const result = await repo.countUnread('usr-123');

      expect(result).toBe(0);
    });

    it('should return zero when query returns null', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.countUnread('usr-123');

      expect(result).toBe(0);
    });

    it('should filter by user_id and is_read false', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '3' });

      const repo = createNotificationRepository(mockDb);
      await repo.countUnread('usr-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*is_read/s),
          values: expect.arrayContaining(['usr-123', false]),
        }),
      );
    });

    it('should handle large counts', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '9999' });

      const repo = createNotificationRepository(mockDb);
      const result = await repo.countUnread('usr-123');

      expect(result).toBe(9999);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and return updated notification', async () => {
      const readNotification = {
        ...mockNotification,
        is_read: true,
        read_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(readNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.markAsRead('notif-123');

      expect(result).toBeDefined();
      expect(result?.isRead).toBe(true);
      expect(result?.readAt).toBeDefined();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*SET.*is_read.*read_at/s),
        }),
      );
    });

    it('should return null when notification not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.markAsRead('notif-nonexistent');

      expect(result).toBeNull();
    });

    it('should set read_at to current timestamp', async () => {
      const readNotification = {
        ...mockNotification,
        is_read: true,
        read_at: new Date(),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(readNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.markAsRead('notif-123');

      expect(result?.readAt).toBeInstanceOf(Date);
    });

    it('should handle already read notifications', async () => {
      const alreadyReadNotification = {
        ...mockNotification,
        is_read: true,
        read_at: new Date('2024-01-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(alreadyReadNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.markAsRead('notif-123');

      expect(result?.isRead).toBe(true);
      expect(result?.readAt).toBeDefined();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read and return count', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.markAllAsRead('usr-123');

      expect(result).toBe(5);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*SET.*is_read.*read_at.*user_id.*is_read/s),
        }),
      );
    });

    it('should return zero when user has no unread notifications', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.markAllAsRead('usr-123');

      expect(result).toBe(0);
    });

    it('should only affect unread notifications', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createNotificationRepository(mockDb);
      await repo.markAllAsRead('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['usr-123', false]),
        }),
      );
    });

    it('should handle large batch updates', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(100);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.markAllAsRead('usr-123');

      expect(result).toBe(100);
    });

    it('should filter by user_id to avoid affecting other users', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createNotificationRepository(mockDb);
      await repo.markAllAsRead('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
          values: expect.arrayContaining(['usr-123']),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete notification and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.delete('notif-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when notification not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.delete('notif-nonexistent');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createNotificationRepository(mockDb);
      await repo.delete('notif-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*notifications/s),
        }),
      );
    });

    it('should only delete exact id match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createNotificationRepository(mockDb);
      const notificationId = 'notif-specific-123';
      await repo.delete(notificationId);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([notificationId]),
        }),
      );
    });

    it('should handle concurrent deletes', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const repo = createNotificationRepository(mockDb);
      const result1 = await repo.delete('notif-123');
      const result2 = await repo.delete('notif-123');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle notifications with complex data objects', async () => {
      const complexData = {
        action: 'navigate',
        url: '/dashboard',
        params: { id: '123', tab: 'settings' },
        metadata: { source: 'system', priority: 'high' },
      };
      const notificationWithComplexData = {
        ...mockNotification,
        data: complexData,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(notificationWithComplexData);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
        data: complexData,
      });

      expect(result.data).toEqual(complexData);
    });

    it('should handle very long message text', async () => {
      const longMessage = 'A'.repeat(1000);
      const notificationWithLongMessage = {
        ...mockNotification,
        message: longMessage,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(notificationWithLongMessage);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'info',
        title: 'Test Notification',
        message: longMessage,
      });

      expect(result.message).toBe(longMessage);
    });

    it('should handle special characters in title and message', async () => {
      const specialTitle = "Test <script>alert('xss')</script>";
      const specialMessage = 'Message with "quotes" and \'apostrophes\'';
      const notificationWithSpecialChars = {
        ...mockNotification,
        title: specialTitle,
        message: specialMessage,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(notificationWithSpecialChars);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'info',
        title: specialTitle,
        message: specialMessage,
      });

      expect(result.title).toBe(specialTitle);
      expect(result.message).toBe(specialMessage);
    });

    it('should handle notifications with null read_at', async () => {
      const unreadNotification = {
        ...mockNotification,
        is_read: false,
        read_at: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(unreadNotification);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findById('notif-123');

      expect(result?.isRead).toBe(false);
      expect(result?.readAt).toBeNull();
    });

    it('should handle timezone-aware timestamps', async () => {
      const timestampWithTz = new Date('2024-01-01T12:00:00.000Z');
      const notificationWithTimestamp = {
        ...mockNotification,
        created_at: timestampWithTz,
        read_at: timestampWithTz,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(notificationWithTimestamp);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.findById('notif-123');

      expect(result?.createdAt).toEqual(timestampWithTz);
      expect(result?.readAt).toEqual(timestampWithTz);
    });

    it('should handle empty string values', async () => {
      const notificationWithEmptyStrings = {
        ...mockNotification,
        title: '',
        message: '',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(notificationWithEmptyStrings);

      const repo = createNotificationRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'info',
        title: '',
        message: '',
      });

      expect(result.title).toBe('');
      expect(result.message).toBe('');
    });

    it('should handle different notification types', async () => {
      const types = ['info', 'success', 'warning', 'error'];

      for (const type of types) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockNotification,
          type,
        });

        const repo = createNotificationRepository(mockDb);
        const result = await repo.findById('notif-123');

        expect(result?.type).toBe(type);
      }
    });
  });
});
