// apps/server/src/infra/database/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';

import { USER_ROLES, users, refreshTokens } from '../schema/users';

describe('db schema', () => {
  describe('USER_ROLES', () => {
    it('should contain expected roles', () => {
      expect(USER_ROLES).toContain('user');
      expect(USER_ROLES).toContain('admin');
      expect(USER_ROLES).toContain('moderator');
    });

    it('should have exactly 3 roles', () => {
      expect(USER_ROLES).toHaveLength(3);
    });

    it('should have roles in correct order (matching shared package)', () => {
      expect(USER_ROLES[0]).toBe('user');
      expect(USER_ROLES[1]).toBe('admin');
      expect(USER_ROLES[2]).toBe('moderator');
    });
  });

  describe('users table', () => {
    it('should be defined', () => {
      expect(users).toBeDefined();
    });

    it('should have expected columns', () => {
      const columnNames = Object.keys(users);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('passwordHash');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('createdAt');
    });
  });

  describe('refreshTokens table', () => {
    it('should be defined', () => {
      expect(refreshTokens).toBeDefined();
    });

    it('should have expected columns', () => {
      const columnNames = Object.keys(refreshTokens);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('token');
      expect(columnNames).toContain('expiresAt');
      expect(columnNames).toContain('createdAt');
    });
  });
});
