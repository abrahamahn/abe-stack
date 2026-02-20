// main/server/core/src/notifications/bounce-handler.test.ts
/**
 * Bounce Handler Unit Tests
 *
 * Tests for email bounce processing including:
 * - Soft bounce tracking and escalation to hard bounce
 * - Hard bounce immediate undeliverable marking
 * - Complaint handling
 * - Delivery recording
 * - Undeliverable status checks
 * - Bounce status reset
 *
 * @complexity O(1) per test - mock DB operations
 */

import { describe, expect, test, vi } from 'vitest';

import {
  getDeliveryRecord,
  isUndeliverable,
  MAX_SOFT_BOUNCES,
  processBounce,
  recordDelivery,
  resetBounceStatus,
} from './bounce-handler';

import type { BounceEvent, DeliveryRecord } from './bounce-handler';
import type { DbClient } from '../../../db/src';

// ============================================================================
// Mock DB Client
// ============================================================================

function createMockDb(initialRecord?: DeliveryRecord | null): DbClient {
  const storedRecord: DeliveryRecord | null = initialRecord ?? null;

  return {
    queryOne: vi.fn(async () => {
      if (storedRecord === null) return null;
      return {
        email: storedRecord.email,
        status: storedRecord.status,
        soft_bounce_count: storedRecord.softBounceCount,
        is_undeliverable: storedRecord.isUndeliverable,
        last_bounce_at: storedRecord.lastBounceAt?.toISOString() ?? null,
        last_delivered_at: storedRecord.lastDeliveredAt?.toISOString() ?? null,
        last_diagnostic: storedRecord.lastDiagnostic,
      };
    }),
    execute: vi.fn(async () => {
      // Capture the upserted record from the call arguments
      return 1;
    }),
    query: vi.fn(async () => []),
  } as unknown as DbClient;
}

// ============================================================================
// processBounce Tests
// ============================================================================

describe('processBounce', () => {
  test('should create a new soft bounce record for unknown email', async () => {
    const db = createMockDb(null);
    const event: BounceEvent = {
      recipient: 'test@example.com',
      bounceType: 'soft',
      statusCode: '452',
      diagnosticMessage: 'Mailbox full',
      bouncedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const result = await processBounce(db, event);

    expect(result.email).toBe('test@example.com');
    expect(result.status).toBe('soft_bounce');
    expect(result.softBounceCount).toBe(1);
    expect(result.isUndeliverable).toBe(false);
    expect(result.lastBounceAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result.lastDiagnostic).toBe('Mailbox full');
  });

  test('should increment soft bounce count on repeated soft bounces', async () => {
    const existing: DeliveryRecord = {
      email: 'test@example.com',
      status: 'soft_bounce',
      softBounceCount: 1,
      isUndeliverable: false,
      lastBounceAt: new Date('2024-01-14T10:00:00Z'),
      lastDeliveredAt: null,
      lastDiagnostic: 'Temporary failure',
    };
    const db = createMockDb(existing);
    const event: BounceEvent = {
      recipient: 'test@example.com',
      bounceType: 'soft',
      diagnosticMessage: 'Mailbox full again',
      bouncedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const result = await processBounce(db, event);

    expect(result.softBounceCount).toBe(2);
    expect(result.status).toBe('soft_bounce');
    expect(result.isUndeliverable).toBe(false);
  });

  test('should escalate to hard bounce after MAX_SOFT_BOUNCES', async () => {
    const existing: DeliveryRecord = {
      email: 'test@example.com',
      status: 'soft_bounce',
      softBounceCount: MAX_SOFT_BOUNCES - 1,
      isUndeliverable: false,
      lastBounceAt: new Date('2024-01-14T10:00:00Z'),
      lastDeliveredAt: null,
      lastDiagnostic: null,
    };
    const db = createMockDb(existing);
    const event: BounceEvent = {
      recipient: 'test@example.com',
      bounceType: 'soft',
      diagnosticMessage: 'Final soft bounce',
      bouncedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const result = await processBounce(db, event);

    expect(result.softBounceCount).toBe(MAX_SOFT_BOUNCES);
    expect(result.status).toBe('hard_bounce');
    expect(result.isUndeliverable).toBe(true);
  });

  test('should immediately mark as undeliverable on hard bounce', async () => {
    const db = createMockDb(null);
    const event: BounceEvent = {
      recipient: 'invalid@nonexistent.example',
      bounceType: 'hard',
      statusCode: '550',
      diagnosticMessage: 'User unknown',
      bouncedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const result = await processBounce(db, event);

    expect(result.status).toBe('hard_bounce');
    expect(result.isUndeliverable).toBe(true);
    expect(result.lastDiagnostic).toBe('User unknown');
  });

  test('should mark as complained on spam complaint', async () => {
    const db = createMockDb(null);
    const event: BounceEvent = {
      recipient: 'spammer@example.com',
      bounceType: 'complaint',
      bouncedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const result = await processBounce(db, event);

    expect(result.status).toBe('complained');
    expect(result.isUndeliverable).toBe(true);
    expect(result.lastDiagnostic).toBe('Spam complaint received');
  });

  test('should call execute to persist the updated record', async () => {
    const db = createMockDb(null);
    const event: BounceEvent = {
      recipient: 'test@example.com',
      bounceType: 'hard',
      bouncedAt: new Date('2024-01-15T10:00:00Z'),
    };

    await processBounce(db, event);

    expect(db.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('INSERT INTO email_delivery_status'),
        values: expect.arrayContaining(['test@example.com', 'hard_bounce']),
      }),
    );
  });
});

// ============================================================================
// recordDelivery Tests
// ============================================================================

describe('recordDelivery', () => {
  test('should create a delivered record for unknown email', async () => {
    const db = createMockDb(null);

    const result = await recordDelivery(db, 'new@example.com');

    expect(result.email).toBe('new@example.com');
    expect(result.status).toBe('delivered');
    expect(result.softBounceCount).toBe(0);
    expect(result.lastDeliveredAt).toBeInstanceOf(Date);
  });

  test('should reset soft bounce count on delivery', async () => {
    const existing: DeliveryRecord = {
      email: 'recovering@example.com',
      status: 'soft_bounce',
      softBounceCount: 2,
      isUndeliverable: false,
      lastBounceAt: new Date('2024-01-14T10:00:00Z'),
      lastDeliveredAt: null,
      lastDiagnostic: 'Temporary failure',
    };
    const db = createMockDb(existing);

    const result = await recordDelivery(db, 'recovering@example.com');

    expect(result.status).toBe('delivered');
    expect(result.softBounceCount).toBe(0);
    expect(result.lastDeliveredAt).toBeInstanceOf(Date);
  });
});

// ============================================================================
// isUndeliverable Tests
// ============================================================================

describe('isUndeliverable', () => {
  test('should return false for unknown email', async () => {
    const db = createMockDb(null);

    const result = await isUndeliverable(db, 'unknown@example.com');

    expect(result).toBe(false);
  });

  test('should return true for hard-bounced email', async () => {
    const existing: DeliveryRecord = {
      email: 'bad@example.com',
      status: 'hard_bounce',
      softBounceCount: 0,
      isUndeliverable: true,
      lastBounceAt: new Date(),
      lastDeliveredAt: null,
      lastDiagnostic: 'User unknown',
    };
    const db = createMockDb(existing);

    const result = await isUndeliverable(db, 'bad@example.com');

    expect(result).toBe(true);
  });

  test('should return false for deliverable email', async () => {
    const existing: DeliveryRecord = {
      email: 'good@example.com',
      status: 'delivered',
      softBounceCount: 0,
      isUndeliverable: false,
      lastBounceAt: null,
      lastDeliveredAt: new Date(),
      lastDiagnostic: null,
    };
    const db = createMockDb(existing);

    const result = await isUndeliverable(db, 'good@example.com');

    expect(result).toBe(false);
  });
});

// ============================================================================
// resetBounceStatus Tests
// ============================================================================

describe('resetBounceStatus', () => {
  test('should return false when no record exists', async () => {
    const db = createMockDb(null);

    const result = await resetBounceStatus(db, 'unknown@example.com');

    expect(result).toBe(false);
  });

  test('should reset bounce status for existing record', async () => {
    const existing: DeliveryRecord = {
      email: 'bounced@example.com',
      status: 'hard_bounce',
      softBounceCount: 5,
      isUndeliverable: true,
      lastBounceAt: new Date(),
      lastDeliveredAt: null,
      lastDiagnostic: 'User unknown',
    };
    const db = createMockDb(existing);

    const result = await resetBounceStatus(db, 'bounced@example.com');

    expect(result).toBe(true);
    expect(db.execute).toHaveBeenCalled();
  });
});

// ============================================================================
// getDeliveryRecord Tests
// ============================================================================

describe('getDeliveryRecord', () => {
  test('should return null for unknown email', async () => {
    const db = createMockDb(null);

    const result = await getDeliveryRecord(db, 'unknown@example.com');

    expect(result).toBeNull();
  });

  test('should return the delivery record with correct shape', async () => {
    const existing: DeliveryRecord = {
      email: 'test@example.com',
      status: 'delivered',
      softBounceCount: 0,
      isUndeliverable: false,
      lastBounceAt: null,
      lastDeliveredAt: new Date('2024-01-15T10:00:00Z'),
      lastDiagnostic: null,
    };
    const db = createMockDb(existing);

    const result = await getDeliveryRecord(db, 'test@example.com');

    expect(result).not.toBeNull();
    expect(result!.email).toBe('test@example.com');
    expect(result!.status).toBe('delivered');
    expect(result!.softBounceCount).toBe(0);
    expect(result!.isUndeliverable).toBe(false);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  test('MAX_SOFT_BOUNCES should be a positive integer', () => {
    expect(MAX_SOFT_BOUNCES).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_SOFT_BOUNCES)).toBe(true);
  });

  test('MAX_SOFT_BOUNCES should be 3', () => {
    expect(MAX_SOFT_BOUNCES).toBe(3);
  });
});
