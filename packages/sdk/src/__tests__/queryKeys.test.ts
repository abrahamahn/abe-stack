// packages/sdk/src/__tests__/queryKeys.test.ts
import { describe, expect, it } from 'vitest';

import { queryKeys } from '../queryKeys';

describe('queryKeys', () => {
  describe('auth', () => {
    it('should have correct base key', () => {
      expect(queryKeys.auth.all).toEqual(['auth']);
    });

    it('should build user key', () => {
      expect(queryKeys.auth.user()).toEqual(['auth', 'user']);
    });

    it('should build session key', () => {
      expect(queryKeys.auth.session()).toEqual(['auth', 'session']);
    });

    it('should build permissions key', () => {
      expect(queryKeys.auth.permissions()).toEqual(['auth', 'permissions']);
    });
  });

  describe('users', () => {
    it('should have correct base key', () => {
      expect(queryKeys.users.all).toEqual(['users']);
    });

    it('should build list key without filters', () => {
      expect(queryKeys.users.list()).toEqual(['users', 'list', undefined]);
    });

    it('should build list key with filters', () => {
      const filters = { page: 1, limit: 10, role: 'admin' };
      expect(queryKeys.users.list(filters)).toEqual(['users', 'list', filters]);
    });

    it('should build detail key', () => {
      expect(queryKeys.users.detail('user-123')).toEqual(['users', 'detail', 'user-123']);
    });

    it('should build profile key', () => {
      expect(queryKeys.users.profile('user-456')).toEqual(['users', 'profile', 'user-456']);
    });
  });

  describe('posts', () => {
    it('should have correct base key', () => {
      expect(queryKeys.posts.all).toEqual(['posts']);
    });

    it('should build list key with filters', () => {
      const filters = { authorId: 'author-1', status: 'published' as const };
      expect(queryKeys.posts.list(filters)).toEqual(['posts', 'list', filters]);
    });

    it('should build detail key', () => {
      expect(queryKeys.posts.detail('post-789')).toEqual(['posts', 'detail', 'post-789']);
    });

    it('should build comments key', () => {
      expect(queryKeys.posts.comments('post-789')).toEqual(['posts', 'post-789', 'comments']);
    });
  });

  describe('notifications', () => {
    it('should have correct base key', () => {
      expect(queryKeys.notifications.all).toEqual(['notifications']);
    });

    it('should build list key with filters', () => {
      expect(queryKeys.notifications.list({ read: false })).toEqual([
        'notifications',
        'list',
        { read: false },
      ]);
    });

    it('should build unreadCount key', () => {
      expect(queryKeys.notifications.unreadCount()).toEqual(['notifications', 'unread-count']);
    });
  });

  describe('settings', () => {
    it('should have correct base key', () => {
      expect(queryKeys.settings.all).toEqual(['settings']);
    });

    it('should build user settings key', () => {
      expect(queryKeys.settings.user()).toEqual(['settings', 'user']);
    });

    it('should build app settings key', () => {
      expect(queryKeys.settings.app()).toEqual(['settings', 'app']);
    });
  });

  describe('type safety', () => {
    it('should preserve tuple types for cache invalidation', () => {
      // These should all be readonly tuples (not mutable arrays)
      const authAll: readonly ['auth'] = queryKeys.auth.all;
      const usersAll: readonly ['users'] = queryKeys.users.all;

      expect(authAll).toBeDefined();
      expect(usersAll).toBeDefined();
    });
  });
});
