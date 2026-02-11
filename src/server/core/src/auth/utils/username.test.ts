// src/server/core/src/auth/utils/username.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateUniqueUsername, splitFullName } from './username';

import type { Repositories } from '@abe-stack/db';

describe('generateUniqueUsername', () => {
  let mockRepos: Repositories;

  beforeEach(() => {
    mockRepos = {
      users: {
        findByUsername: vi.fn(),
      },
    } as unknown as Repositories;
    vi.clearAllMocks();
  });

  describe('when username is available', () => {
    it('should use email prefix when available', async () => {
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);

      const result = await generateUniqueUsername(mockRepos, 'john.doe@example.com');

      expect(result).toBe('johndoe');
      expect(mockRepos.users.findByUsername).toHaveBeenCalledWith('johndoe');
      expect(mockRepos.users.findByUsername).toHaveBeenCalledTimes(1);
    });

    it('should lowercase and strip invalid characters from email prefix', async () => {
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);

      const result = await generateUniqueUsername(mockRepos, 'John-DOE!123@example.com');

      expect(result).toBe('johndoe123');
      expect(mockRepos.users.findByUsername).toHaveBeenCalledWith('johndoe123');
    });

    it('should handle underscore as valid character', async () => {
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);

      const result = await generateUniqueUsername(mockRepos, 'john_doe@example.com');

      expect(result).toBe('john_doe');
      expect(mockRepos.users.findByUsername).toHaveBeenCalledWith('john_doe');
    });
  });

  describe('when handling edge cases', () => {
    it('should fall back to "user" when email prefix is empty', async () => {
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);

      const result = await generateUniqueUsername(mockRepos, '@example.com');

      expect(result).toBe('user');
      expect(mockRepos.users.findByUsername).toHaveBeenCalledWith('user');
    });

    it('should fall back to "user" when sanitized prefix is empty', async () => {
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);

      const result = await generateUniqueUsername(mockRepos, '!@#$%@example.com');

      expect(result).toBe('user');
      expect(mockRepos.users.findByUsername).toHaveBeenCalledWith('user');
    });

    it('should truncate prefix to 15 chars', async () => {
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);

      const result = await generateUniqueUsername(
        mockRepos,
        'verylongusername1234567890@example.com',
      );

      expect(result.length).toBeLessThanOrEqual(15);
      expect(result).toBe('verylongusernam'); // exactly 15 chars
      expect(mockRepos.users.findByUsername).toHaveBeenCalledWith('verylongusernam');
    });
  });

  describe('when handling collisions', () => {
    it('should append suffix on first collision', async () => {
      vi.mocked(mockRepos.users.findByUsername)
        .mockResolvedValueOnce({ id: 'existing' } as any)
        .mockResolvedValueOnce(null);

      const result = await generateUniqueUsername(mockRepos, 'john@example.com');

      expect(result).toMatch(/^john_[a-f0-9]{4}$/);
      expect(mockRepos.users.findByUsername).toHaveBeenCalledTimes(2);
      expect(mockRepos.users.findByUsername).toHaveBeenNthCalledWith(1, 'john');
      expect(result.length).toBeLessThanOrEqual(15);
    });

    it('should retry with different suffix on continued collisions', async () => {
      vi.mocked(mockRepos.users.findByUsername)
        .mockResolvedValueOnce({ id: 'existing1' } as any) // bare prefix collision
        .mockResolvedValueOnce({ id: 'existing2' } as any) // first suffix collision
        .mockResolvedValueOnce({ id: 'existing3' } as any) // second suffix collision
        .mockResolvedValueOnce(null); // finally available

      const result = await generateUniqueUsername(mockRepos, 'john@example.com');

      expect(result).toMatch(/^john_[a-f0-9]{4}$/);
      expect(mockRepos.users.findByUsername).toHaveBeenCalledTimes(4);
      expect(result.length).toBeLessThanOrEqual(15);
    });

    it('should truncate prefix when appending suffix to stay within 15 chars', async () => {
      vi.mocked(mockRepos.users.findByUsername)
        .mockResolvedValueOnce({ id: 'existing' } as any)
        .mockResolvedValueOnce(null);

      const result = await generateUniqueUsername(
        mockRepos,
        'verylongusername1234567890@example.com',
      );

      expect(result.length).toBeLessThanOrEqual(15);
      expect(result).toMatch(/^verylongus_[a-f0-9]{4}$/); // 10 chars prefix + "_" + 4 hex = 15
    });
  });

  describe('when exceeding collision retry limit', () => {
    it('should fall back to "user_XXXXXXXX" after 5 collision retries', async () => {
      // 1 bare prefix + 5 suffix attempts = 6 collisions
      vi.mocked(mockRepos.users.findByUsername)
        .mockResolvedValueOnce({ id: 'existing1' } as any)
        .mockResolvedValueOnce({ id: 'existing2' } as any)
        .mockResolvedValueOnce({ id: 'existing3' } as any)
        .mockResolvedValueOnce({ id: 'existing4' } as any)
        .mockResolvedValueOnce({ id: 'existing5' } as any)
        .mockResolvedValueOnce({ id: 'existing6' } as any);

      const result = await generateUniqueUsername(mockRepos, 'john@example.com');

      expect(result).toMatch(/^user_[a-f0-9]{8}$/);
      expect(mockRepos.users.findByUsername).toHaveBeenCalledTimes(6);
      expect(result.length).toBeLessThanOrEqual(15);
    });

    it('should ensure fallback username fits within 15 chars', async () => {
      vi.mocked(mockRepos.users.findByUsername)
        .mockResolvedValueOnce({ id: 'existing1' } as any)
        .mockResolvedValueOnce({ id: 'existing2' } as any)
        .mockResolvedValueOnce({ id: 'existing3' } as any)
        .mockResolvedValueOnce({ id: 'existing4' } as any)
        .mockResolvedValueOnce({ id: 'existing5' } as any)
        .mockResolvedValueOnce({ id: 'existing6' } as any);

      const result = await generateUniqueUsername(mockRepos, 'test@example.com');

      expect(result.length).toBe(13); // "user_" (5) + 8 hex chars = 13
      expect(result.length).toBeLessThanOrEqual(15);
    });
  });

  describe('username validation', () => {
    it('should return username matching allowed characters pattern', async () => {
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);

      const result = await generateUniqueUsername(mockRepos, 'test123@example.com');

      expect(result).toMatch(/^[a-z0-9_]+$/);
    });

    it('should return username matching pattern even with collision', async () => {
      vi.mocked(mockRepos.users.findByUsername)
        .mockResolvedValueOnce({ id: 'existing' } as any)
        .mockResolvedValueOnce(null);

      const result = await generateUniqueUsername(mockRepos, 'test123@example.com');

      expect(result).toMatch(/^[a-z0-9_]+$/);
    });

    it('should return username matching pattern even with fallback', async () => {
      vi.mocked(mockRepos.users.findByUsername)
        .mockResolvedValueOnce({ id: 'existing1' } as any)
        .mockResolvedValueOnce({ id: 'existing2' } as any)
        .mockResolvedValueOnce({ id: 'existing3' } as any)
        .mockResolvedValueOnce({ id: 'existing4' } as any)
        .mockResolvedValueOnce({ id: 'existing5' } as any)
        .mockResolvedValueOnce({ id: 'existing6' } as any);

      const result = await generateUniqueUsername(mockRepos, 'test@example.com');

      expect(result).toMatch(/^[a-z0-9_]+$/);
    });
  });
});

describe('splitFullName', () => {
  describe('when given null or empty input', () => {
    it('should return default User for null', () => {
      const result = splitFullName(null);

      expect(result).toEqual({ firstName: 'User', lastName: '' });
    });

    it('should return default User for empty string', () => {
      const result = splitFullName('');

      expect(result).toEqual({ firstName: 'User', lastName: '' });
    });

    it('should return default User for whitespace only', () => {
      const result = splitFullName('   ');

      expect(result).toEqual({ firstName: 'User', lastName: '' });
    });
  });

  describe('when given single name', () => {
    it('should use entire string as firstName', () => {
      const result = splitFullName('John');

      expect(result).toEqual({ firstName: 'John', lastName: '' });
    });

    it('should trim leading and trailing whitespace', () => {
      const result = splitFullName('  John  ');

      expect(result).toEqual({ firstName: 'John', lastName: '' });
    });
  });

  describe('when given two names', () => {
    it('should split on first space', () => {
      const result = splitFullName('John Doe');

      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('should handle extra whitespace between names', () => {
      const result = splitFullName('John   Doe');

      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('should trim leading and trailing whitespace', () => {
      const result = splitFullName('  John Doe  ');

      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
    });
  });

  describe('when given multiple names', () => {
    it('should put everything after first space in lastName', () => {
      const result = splitFullName('John van Doe');

      expect(result).toEqual({ firstName: 'John', lastName: 'van Doe' });
    });

    it('should handle complex multi-part last names', () => {
      const result = splitFullName('John Paul George Ringo');

      expect(result).toEqual({ firstName: 'John', lastName: 'Paul George Ringo' });
    });

    it('should trim lastName whitespace', () => {
      const result = splitFullName('John  van   Doe  ');

      expect(result).toEqual({ firstName: 'John', lastName: 'van   Doe' });
    });
  });
});
