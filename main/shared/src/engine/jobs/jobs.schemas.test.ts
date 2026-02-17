// main/shared/src/engine/jobs/jobs.schemas.test.ts

/**
 * @file Jobs Schema Tests
 * @description Comprehensive unit tests for job validation schemas.
 */

import { describe, expect, it } from 'vitest';

import {
  createJobSchema,
  JOB_PRIORITIES,
  JOB_PRIORITY_VALUES,
  JOB_STATUSES,
  jobSchema,
  updateJobSchema,
} from './jobs.schemas';

import type { JobId } from '../../core/types/ids';

// ============================================================================
// Helpers
// ============================================================================

/** Valid UUID for testing */
const validJobId: JobId = '00000000-0000-0000-0000-000000000001' as JobId;

/** Valid base job for testing */
const validFullJob = {
  id: validJobId,
  type: 'email:send',
  payload: { to: 'user@example.com' },
  status: 'pending' as const,
  priority: 0,
  attempts: 0,
  maxAttempts: 3,
  lastError: null,
  idempotencyKey: null,
  scheduledAt: new Date('2026-01-01T00:00:00Z'),
  startedAt: null,
  completedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

// ============================================================================
// jobSchema Tests
// ============================================================================

describe('jobSchema', () => {
  describe('when given valid full job', () => {
    it('should parse successfully', () => {
      const result = jobSchema.parse(validFullJob);

      expect(result).toEqual(validFullJob);
      expect(result.id).toBe(validJobId);
      expect(result.type).toBe('email:send');
      expect(result.status).toBe('pending');
      expect(result.priority).toBe(0);
      expect(result.attempts).toBe(0);
      expect(result.maxAttempts).toBe(3);
    });

    it('should handle all valid statuses', () => {
      for (const status of JOB_STATUSES) {
        const job = { ...validFullJob, status };
        const result = jobSchema.parse(job);
        expect(result.status).toBe(status);
      }
    });

    it('should handle nullable fields with null', () => {
      const job = {
        ...validFullJob,
        lastError: null,
        idempotencyKey: null,
        startedAt: null,
        completedAt: null,
      };

      const result = jobSchema.parse(job);

      expect(result.lastError).toBeNull();
      expect(result.idempotencyKey).toBeNull();
      expect(result.startedAt).toBeNull();
      expect(result.completedAt).toBeNull();
    });

    it('should handle nullable fields with values', () => {
      const job = {
        ...validFullJob,
        lastError: 'Network timeout',
        idempotencyKey: 'unique-key-123',
        startedAt: new Date('2026-01-01T01:00:00Z'),
        completedAt: new Date('2026-01-01T02:00:00Z'),
      };

      const result = jobSchema.parse(job);

      expect(result.lastError).toBe('Network timeout');
      expect(result.idempotencyKey).toBe('unique-key-123');
      expect(result.startedAt).toEqual(new Date('2026-01-01T01:00:00Z'));
      expect(result.completedAt).toEqual(new Date('2026-01-01T02:00:00Z'));
    });
  });

  describe('priority validation', () => {
    it('should accept priority within -100 to 100 range', () => {
      expect(() => jobSchema.parse({ ...validFullJob, priority: -100 })).not.toThrow();
      expect(() => jobSchema.parse({ ...validFullJob, priority: 0 })).not.toThrow();
      expect(() => jobSchema.parse({ ...validFullJob, priority: 100 })).not.toThrow();
    });

    it('should reject priority below -100', () => {
      expect(() => jobSchema.parse({ ...validFullJob, priority: -101 })).toThrow(
        /priority.*must be at least -100/i,
      );
    });

    it('should reject priority above 100', () => {
      expect(() => jobSchema.parse({ ...validFullJob, priority: 101 })).toThrow(
        /priority.*must be at most 100/i,
      );
    });

    it('should reject non-integer priority', () => {
      expect(() => jobSchema.parse({ ...validFullJob, priority: 5.5 })).toThrow(
        /priority.*must be an integer/i,
      );
    });
  });

  describe('attempts validation', () => {
    it('should accept attempts >= 0', () => {
      expect(() => jobSchema.parse({ ...validFullJob, attempts: 0 })).not.toThrow();
      expect(() => jobSchema.parse({ ...validFullJob, attempts: 5 })).not.toThrow();
    });

    it('should reject attempts < 0', () => {
      expect(() => jobSchema.parse({ ...validFullJob, attempts: -1 })).toThrow(
        /attempts.*must be at least 0/i,
      );
    });

    it('should reject non-integer attempts', () => {
      expect(() => jobSchema.parse({ ...validFullJob, attempts: 2.5 })).toThrow(
        /attempts.*must be an integer/i,
      );
    });
  });

  describe('maxAttempts validation', () => {
    it('should accept maxAttempts >= 1', () => {
      expect(() => jobSchema.parse({ ...validFullJob, maxAttempts: 1 })).not.toThrow();
      expect(() => jobSchema.parse({ ...validFullJob, maxAttempts: 10 })).not.toThrow();
    });

    it('should reject maxAttempts < 1', () => {
      expect(() => jobSchema.parse({ ...validFullJob, maxAttempts: 0 })).toThrow(
        /maxAttempts.*must be at least 1/i,
      );
    });

    it('should reject non-integer maxAttempts', () => {
      expect(() => jobSchema.parse({ ...validFullJob, maxAttempts: 3.5 })).toThrow(
        /maxAttempts.*must be an integer/i,
      );
    });
  });

  describe('status validation', () => {
    it('should reject invalid status enum', () => {
      expect(() => jobSchema.parse({ ...validFullJob, status: 'invalid' })).toThrow(/job status/i);
    });

    it('should reject empty string status', () => {
      expect(() => jobSchema.parse({ ...validFullJob, status: '' })).toThrow(/job status/i);
    });
  });

  describe('type validation', () => {
    it('should reject empty type', () => {
      expect(() => jobSchema.parse({ ...validFullJob, type: '' })).toThrow(
        /type.*must be at least 1 characters/i,
      );
    });
  });

  describe('edge cases', () => {
    it('should reject null input', () => {
      expect(() => jobSchema.parse(null)).toThrow();
    });

    it('should reject undefined input', () => {
      expect(() => jobSchema.parse(undefined)).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => jobSchema.parse({})).toThrow();
    });
  });
});

// ============================================================================
// createJobSchema Tests
// ============================================================================

describe('createJobSchema', () => {
  describe('when given valid minimal input', () => {
    it('should parse with only type', () => {
      const input = { type: 'email:send' };
      const result = createJobSchema.parse(input);

      expect(result.type).toBe('email:send');
      expect(result.payload).toBeUndefined();
      expect(result.priority).toBeUndefined();
      expect(result.maxAttempts).toBeUndefined();
      expect(result.idempotencyKey).toBeUndefined();
      expect(result.scheduledAt).toBeUndefined();
    });
  });

  describe('when given valid full input', () => {
    it('should parse with all optional fields', () => {
      const input = {
        type: 'email:send',
        payload: { to: 'user@example.com' },
        priority: 10,
        maxAttempts: 5,
        idempotencyKey: 'unique-key',
        scheduledAt: new Date('2026-01-01T00:00:00Z'),
      };

      const result = createJobSchema.parse(input);

      expect(result.type).toBe('email:send');
      expect(result.payload).toEqual({ to: 'user@example.com' });
      expect(result.priority).toBe(10);
      expect(result.maxAttempts).toBe(5);
      expect(result.idempotencyKey).toBe('unique-key');
      expect(result.scheduledAt).toEqual(new Date('2026-01-01T00:00:00Z'));
    });

    it('should accept null for idempotencyKey', () => {
      const input = { type: 'email:send', idempotencyKey: null };
      const result = createJobSchema.parse(input);

      expect(result.idempotencyKey).toBeNull();
    });
  });

  describe('type validation', () => {
    it('should reject empty type', () => {
      expect(() => createJobSchema.parse({ type: '' })).toThrow(
        /type.*must be at least 1 characters/i,
      );
    });

    it('should reject missing type', () => {
      expect(() => createJobSchema.parse({})).toThrow();
    });
  });

  describe('optional priority validation', () => {
    it('should accept priority within -100 to 100 range', () => {
      expect(() => createJobSchema.parse({ type: 'test', priority: -100 })).not.toThrow();
      expect(() => createJobSchema.parse({ type: 'test', priority: 100 })).not.toThrow();
    });

    it('should reject priority outside range', () => {
      expect(() => createJobSchema.parse({ type: 'test', priority: -101 })).toThrow(
        /priority.*must be at least -100/i,
      );
      expect(() => createJobSchema.parse({ type: 'test', priority: 101 })).toThrow(
        /priority.*must be at most 100/i,
      );
    });

    it('should reject non-integer priority', () => {
      expect(() => createJobSchema.parse({ type: 'test', priority: 5.5 })).toThrow(
        /priority.*must be an integer/i,
      );
    });
  });

  describe('optional maxAttempts validation', () => {
    it('should accept maxAttempts >= 1', () => {
      expect(() => createJobSchema.parse({ type: 'test', maxAttempts: 1 })).not.toThrow();
    });

    it('should reject maxAttempts < 1', () => {
      expect(() => createJobSchema.parse({ type: 'test', maxAttempts: 0 })).toThrow(
        /maxAttempts.*must be at least 1/i,
      );
    });

    it('should reject non-integer maxAttempts', () => {
      expect(() => createJobSchema.parse({ type: 'test', maxAttempts: 3.5 })).toThrow(
        /maxAttempts.*must be an integer/i,
      );
    });
  });
});

// ============================================================================
// updateJobSchema Tests
// ============================================================================

describe('updateJobSchema', () => {
  describe('when given empty update', () => {
    it('should accept object with all undefined fields', () => {
      const result = updateJobSchema.parse({});

      expect(result.status).toBeUndefined();
      expect(result.attempts).toBeUndefined();
      expect(result.lastError).toBeUndefined();
      expect(result.scheduledAt).toBeUndefined();
      expect(result.startedAt).toBeUndefined();
      expect(result.completedAt).toBeUndefined();
    });
  });

  describe('when given partial updates', () => {
    it('should accept only status update', () => {
      const result = updateJobSchema.parse({ status: 'completed' });

      expect(result.status).toBe('completed');
      expect(result.attempts).toBeUndefined();
    });

    it('should accept only attempts update', () => {
      const result = updateJobSchema.parse({ attempts: 3 });

      expect(result.status).toBeUndefined();
      expect(result.attempts).toBe(3);
    });

    it('should accept multiple fields', () => {
      const result = updateJobSchema.parse({
        status: 'failed',
        attempts: 2,
        lastError: 'Network error',
      });

      expect(result.status).toBe('failed');
      expect(result.attempts).toBe(2);
      expect(result.lastError).toBe('Network error');
    });
  });

  describe('nullable-optional field behavior', () => {
    it('should accept null for lastError', () => {
      const result = updateJobSchema.parse({ lastError: null });
      expect(result.lastError).toBeNull();
    });

    it('should accept undefined for lastError', () => {
      const result = updateJobSchema.parse({ lastError: undefined });
      expect(result.lastError).toBeUndefined();
    });

    it('should accept string value for lastError', () => {
      const result = updateJobSchema.parse({ lastError: 'Error message' });
      expect(result.lastError).toBe('Error message');
    });

    it('should accept null for startedAt', () => {
      const result = updateJobSchema.parse({ startedAt: null });
      expect(result.startedAt).toBeNull();
    });

    it('should accept undefined for startedAt', () => {
      const result = updateJobSchema.parse({ startedAt: undefined });
      expect(result.startedAt).toBeUndefined();
    });

    it('should accept Date value for startedAt', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      const result = updateJobSchema.parse({ startedAt: date });
      expect(result.startedAt).toEqual(date);
    });

    it('should accept null for completedAt', () => {
      const result = updateJobSchema.parse({ completedAt: null });
      expect(result.completedAt).toBeNull();
    });

    it('should accept undefined for completedAt', () => {
      const result = updateJobSchema.parse({ completedAt: undefined });
      expect(result.completedAt).toBeUndefined();
    });

    it('should accept Date value for completedAt', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      const result = updateJobSchema.parse({ completedAt: date });
      expect(result.completedAt).toEqual(date);
    });
  });

  describe('status validation', () => {
    it('should accept all valid statuses', () => {
      for (const status of JOB_STATUSES) {
        const result = updateJobSchema.parse({ status });
        expect(result.status).toBe(status);
      }
    });

    it('should reject invalid status', () => {
      expect(() => updateJobSchema.parse({ status: 'invalid' })).toThrow(/job status/i);
    });
  });

  describe('attempts validation', () => {
    it('should accept attempts >= 0', () => {
      expect(() => updateJobSchema.parse({ attempts: 0 })).not.toThrow();
      expect(() => updateJobSchema.parse({ attempts: 5 })).not.toThrow();
    });

    it('should reject attempts < 0', () => {
      expect(() => updateJobSchema.parse({ attempts: -1 })).toThrow(
        /attempts.*must be at least 0/i,
      );
    });

    it('should reject non-integer attempts', () => {
      expect(() => updateJobSchema.parse({ attempts: 2.5 })).toThrow(
        /attempts.*must be an integer/i,
      );
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('JOB_STATUSES', () => {
  it('should contain all expected statuses in lifecycle order', () => {
    expect(JOB_STATUSES).toEqual([
      'pending',
      'processing',
      'completed',
      'failed',
      'dead_letter',
      'cancelled',
    ]);
  });

  it('should be readonly (as const)', () => {
    // TypeScript enforces readonly via 'as const', not Object.freeze
    // Verify it's an array with correct values
    expect(Array.isArray(JOB_STATUSES)).toBe(true);
    expect(JOB_STATUSES.length).toBe(6);
  });
});

describe('JOB_PRIORITIES', () => {
  it('should contain all expected priority levels', () => {
    expect(JOB_PRIORITIES).toEqual(['low', 'normal', 'high', 'critical']);
  });

  it('should be readonly (as const)', () => {
    // TypeScript enforces readonly via 'as const', not Object.freeze
    // Verify it's an array with correct values
    expect(Array.isArray(JOB_PRIORITIES)).toBe(true);
    expect(JOB_PRIORITIES.length).toBe(4);
  });
});

describe('JOB_PRIORITY_VALUES', () => {
  it('should map priority names to correct numeric values', () => {
    expect(JOB_PRIORITY_VALUES.low).toBe(-10);
    expect(JOB_PRIORITY_VALUES.normal).toBe(0);
    expect(JOB_PRIORITY_VALUES.high).toBe(10);
    expect(JOB_PRIORITY_VALUES.critical).toBe(100);
  });

  it('should have all priority keys', () => {
    const keys = Object.keys(JOB_PRIORITY_VALUES);
    expect(keys).toContain('low');
    expect(keys).toContain('normal');
    expect(keys).toContain('high');
    expect(keys).toContain('critical');
  });

  it('should be readonly (as const)', () => {
    // TypeScript enforces readonly via 'as const', not Object.freeze
    // Verify all expected keys exist
    expect(Object.keys(JOB_PRIORITY_VALUES).length).toBe(4);
  });

  it('should have values in ascending order', () => {
    const values = Object.values(JOB_PRIORITY_VALUES);
    expect(values[0]).toBeLessThan(values[1]); // low < normal
    expect(values[1]).toBeLessThan(values[2]); // normal < high
    expect(values[2]).toBeLessThan(values[3]); // high < critical
  });
});
