// src/server/core/src/auth/totp.test.ts

import { Secret, TOTP } from 'otpauth';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  setupTotp,
  enableTotp,
  disableTotp,
  getTotpStatus,
  verifyTotpForLogin,
  verifyTotpCode,
} from './totp';

import type { DbClient } from '@abe-stack/db';
import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('./utils', () => ({
  hashPassword: vi.fn(),
  verifyPasswordSafe: vi.fn(),
}));

const { hashPassword, verifyPasswordSafe } = await import('./utils');

// ============================================================================
// Test Setup
// ============================================================================

const mockHashPassword = hashPassword as ReturnType<typeof vi.fn>;
const mockVerifyPasswordSafe = verifyPasswordSafe as ReturnType<typeof vi.fn>;

const mockConfig: AuthConfig = {
  totp: {
    issuer: 'TestApp',
    window: 1,
  },
} as AuthConfig;

function createMockDb(): DbClient {
  return {
    raw: vi.fn(),
  } as unknown as DbClient;
}

// ============================================================================
// Tests: setupTotp
// ============================================================================

describe('setupTotp', () => {
  let db: DbClient;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  test('should generate secret, otpauth URL, and backup codes', async () => {
    // Mock implementation for each backup code hash
    for (let i = 0; i < 10; i++) {
      mockHashPassword.mockResolvedValueOnce(`hashed_code_${i}`);
    }

    const result = await setupTotp(db, 'user-123', 'test@example.com', mockConfig);

    expect(result).toHaveProperty('secret');
    expect(result).toHaveProperty('otpauthUrl');
    expect(result).toHaveProperty('backupCodes');
    expect(result.secret).toMatch(/^[A-Z2-7]+=*$/); // Base32 format
    expect(result.otpauthUrl).toContain('otpauth://totp/');
    expect(result.otpauthUrl).toContain('TestApp');
    expect(result.otpauthUrl).toMatch(/test%40example\.com|test@example\.com/); // Email may be URL-encoded
    expect(result.backupCodes).toHaveLength(10);
    result.backupCodes.forEach((code) => {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });
  });

  test('should store secret in database with totp_enabled = false', async () => {
    for (let i = 0; i < 10; i++) {
      mockHashPassword.mockResolvedValueOnce(`hashed_code_${i}`);
    }

    const result = await setupTotp(db, 'user-123', 'test@example.com', mockConfig);

    expect(db.raw).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET totp_secret = $1, totp_enabled = false'),
      [result.secret, 'user-123'],
    );
  });

  test('should hash and store all backup codes', async () => {
    for (let i = 0; i < 10; i++) {
      mockHashPassword.mockResolvedValueOnce(`hashed_code_${i}`);
    }

    await setupTotp(db, 'user-123', 'test@example.com', mockConfig);

    expect(mockHashPassword).toHaveBeenCalledTimes(10);
    expect(db.raw).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO totp_backup_codes'),
      expect.arrayContaining(['user-123', expect.stringMatching(/^hashed_code_\d+$/)]),
    );
  });

  test('should delete old backup codes before inserting new ones', async () => {
    for (let i = 0; i < 10; i++) {
      mockHashPassword.mockResolvedValueOnce(`hashed_code_${i}`);
    }

    await setupTotp(db, 'user-123', 'test@example.com', mockConfig);

    expect(db.raw).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM totp_backup_codes WHERE user_id = $1'),
      ['user-123'],
    );
  });
});

// ============================================================================
// Tests: enableTotp
// ============================================================================

describe('enableTotp', () => {
  let db: DbClient;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  test('should enable 2FA when valid code provided', async () => {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const validCode = totp.generate();

    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: secret.base32, totp_enabled: false },
    ]);

    const result = await enableTotp(db, 'user-123', validCode, mockConfig);

    expect(result.success).toBe(true);
    expect(result.message).toContain('enabled successfully');
    expect(db.raw).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET totp_enabled = true'),
      ['user-123'],
    );
  });

  test('should reject invalid TOTP code', async () => {
    const secret = new Secret({ size: 20 });

    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: secret.base32, totp_enabled: false },
    ]);

    const result = await enableTotp(db, 'user-123', '000000', mockConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid TOTP code');
  });

  test('should reject when 2FA already enabled', async () => {
    const secret = new Secret({ size: 20 });

    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: secret.base32, totp_enabled: true },
    ]);

    const result = await enableTotp(db, 'user-123', '123456', mockConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('already enabled');
  });

  test('should reject when no secret exists', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: null, totp_enabled: false },
    ]);

    const result = await enableTotp(db, 'user-123', '123456', mockConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not set up');
  });

  test('should reject when user not found', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const result = await enableTotp(db, 'user-123', '123456', mockConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not set up');
  });
});

// ============================================================================
// Tests: disableTotp
// ============================================================================

describe('disableTotp', () => {
  let db: DbClient;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
    mockVerifyPasswordSafe.mockResolvedValue(false);
  });

  test('should disable 2FA with valid TOTP code', async () => {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const validCode = totp.generate();

    (db.raw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ totp_secret: secret.base32, totp_enabled: true }])
      .mockResolvedValueOnce([]); // No backup codes

    const result = await disableTotp(db, 'user-123', validCode, mockConfig);

    expect(result.success).toBe(true);
    expect(result.message).toContain('disabled');
    expect(db.raw).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET totp_enabled = false, totp_secret = NULL'),
      ['user-123'],
    );
    expect(db.raw).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM totp_backup_codes'), [
      'user-123',
    ]);
  });

  test('should disable 2FA with valid backup code', async () => {
    const secret = new Secret({ size: 20 });

    (db.raw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ totp_secret: secret.base32, totp_enabled: true }])
      .mockResolvedValueOnce([{ id: 'backup-1', code_hash: 'hashed_backup' }])
      .mockResolvedValueOnce([]) // UPDATE backup code
      .mockResolvedValueOnce([]) // UPDATE user
      .mockResolvedValueOnce([]); // DELETE backup codes

    mockVerifyPasswordSafe.mockResolvedValueOnce(true);

    const result = await disableTotp(db, 'user-123', 'BACKUP-CODE', mockConfig);

    expect(result.success).toBe(true);
    expect(mockVerifyPasswordSafe).toHaveBeenCalledWith('BACKUP-CODE', 'hashed_backup');
  });

  test('should reject invalid code', async () => {
    const secret = new Secret({ size: 20 });

    (db.raw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ totp_secret: secret.base32, totp_enabled: true }])
      .mockResolvedValueOnce([]); // No backup codes

    const result = await disableTotp(db, 'user-123', '000000', mockConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid code');
  });

  test('should reject when 2FA not enabled', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: null, totp_enabled: false },
    ]);

    const result = await disableTotp(db, 'user-123', '123456', mockConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not enabled');
  });

  test('should reject when user not found', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const result = await disableTotp(db, 'user-123', '123456', mockConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not enabled');
  });
});

// ============================================================================
// Tests: getTotpStatus
// ============================================================================

describe('getTotpStatus', () => {
  let db: DbClient;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  test('should return enabled true when 2FA is enabled', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ totp_enabled: true }]);

    const result = await getTotpStatus(db, 'user-123');

    expect(result.enabled).toBe(true);
  });

  test('should return enabled false when 2FA is disabled', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ totp_enabled: false }]);

    const result = await getTotpStatus(db, 'user-123');

    expect(result.enabled).toBe(false);
  });

  test('should return enabled false when user not found', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const result = await getTotpStatus(db, 'user-123');

    expect(result.enabled).toBe(false);
  });

  test('should return enabled false when totp_enabled is null', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ totp_enabled: null }]);

    const result = await getTotpStatus(db, 'user-123');

    expect(result.enabled).toBe(false);
  });
});

// ============================================================================
// Tests: verifyTotpForLogin
// ============================================================================

describe('verifyTotpForLogin', () => {
  let db: DbClient;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
    mockVerifyPasswordSafe.mockResolvedValue(false);
  });

  test('should return true for valid TOTP code', async () => {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const validCode = totp.generate();

    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: secret.base32, totp_enabled: true },
    ]);

    const result = await verifyTotpForLogin(db, 'user-123', validCode, mockConfig);

    expect(result).toBe(true);
  });

  test('should return true for valid backup code', async () => {
    const secret = new Secret({ size: 20 });

    (db.raw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ totp_secret: secret.base32, totp_enabled: true }])
      .mockResolvedValueOnce([{ id: 'backup-1', code_hash: 'hashed_backup' }])
      .mockResolvedValueOnce([]); // UPDATE backup code

    mockVerifyPasswordSafe.mockResolvedValueOnce(true);

    const result = await verifyTotpForLogin(db, 'user-123', 'BACKUP-CODE', mockConfig);

    expect(result).toBe(true);
    expect(mockVerifyPasswordSafe).toHaveBeenCalledWith('BACKUP-CODE', 'hashed_backup');
  });

  test('should return false for invalid code', async () => {
    const secret = new Secret({ size: 20 });

    (db.raw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ totp_secret: secret.base32, totp_enabled: true }])
      .mockResolvedValueOnce([]); // No backup codes

    const result = await verifyTotpForLogin(db, 'user-123', '000000', mockConfig);

    expect(result).toBe(false);
  });

  test('should return false when 2FA not enabled', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: null, totp_enabled: false },
    ]);

    const result = await verifyTotpForLogin(db, 'user-123', '123456', mockConfig);

    expect(result).toBe(false);
  });

  test('should return false when user not found', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const result = await verifyTotpForLogin(db, 'user-123', '123456', mockConfig);

    expect(result).toBe(false);
  });

  test('should return false when secret is null but enabled is true', async () => {
    (db.raw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { totp_secret: null, totp_enabled: true },
    ]);

    const result = await verifyTotpForLogin(db, 'user-123', '123456', mockConfig);

    expect(result).toBe(false);
  });

  test('should mark backup code as used when consumed', async () => {
    const secret = new Secret({ size: 20 });

    (db.raw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ totp_secret: secret.base32, totp_enabled: true }])
      .mockResolvedValueOnce([{ id: 'backup-1', code_hash: 'hashed_backup' }])
      .mockResolvedValueOnce([]); // UPDATE backup code

    mockVerifyPasswordSafe.mockResolvedValueOnce(true);

    await verifyTotpForLogin(db, 'user-123', 'BACKUP-CODE', mockConfig);

    expect(db.raw).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE totp_backup_codes SET used_at = now()'),
      ['backup-1'],
    );
  });
});

// ============================================================================
// Tests: verifyTotpCode (pure function)
// ============================================================================

describe('verifyTotpCode', () => {
  test('should verify valid TOTP code', () => {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const validCode = totp.generate();

    const result = verifyTotpCode(secret.base32, validCode, 1);

    expect(result).toBe(true);
  });

  test('should reject invalid TOTP code', () => {
    const secret = new Secret({ size: 20 });

    const result = verifyTotpCode(secret.base32, '000000', 1);

    expect(result).toBe(false);
  });

  test('should accept code within time window', () => {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    // Generate code for current time
    const validCode = totp.generate();

    // Verify with window = 1 (allows ±1 time step)
    const result = verifyTotpCode(secret.base32, validCode, 1);

    expect(result).toBe(true);
  });

  test('should reject code with zero window if time drifted', () => {
    const secret = new Secret({ size: 20 });

    // Using a known invalid code with window = 0
    const result = verifyTotpCode(secret.base32, '999999', 0);

    expect(result).toBe(false);
  });

  test('should handle different secret formats', () => {
    // Use a known base32 secret
    const knownSecret = 'JBSWY3DPEHPK3PXP'; // "Hello!" in base32
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(knownSecret),
    });
    const validCode = totp.generate();

    const result = verifyTotpCode(knownSecret, validCode, 1);

    expect(result).toBe(true);
  });
});
