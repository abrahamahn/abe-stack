// main/server/core/src/api-keys/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiKey, deleteApiKey, generateApiKey, listApiKeys, revokeApiKey } from './service';

import type { ApiKey, ApiKeyRepository } from '../../../db/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepo(): ApiKeyRepository {
  return {
    create: vi.fn(),
    findByKeyHash: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByTenantId: vi.fn(),
    update: vi.fn(),
    revoke: vi.fn(),
    updateLastUsed: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockApiKey(overrides?: Partial<ApiKey>): ApiKey {
  return {
    id: 'key-1',
    tenantId: null,
    userId: 'user-1',
    name: 'Test Key',
    keyPrefix: 'abcd1234',
    keyHash: 'hash-abc',
    scopes: [],
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// generateApiKey
// ============================================================================

describe('generateApiKey', () => {
  it('should return a 64-char hex plaintext (32 bytes)', () => {
    const result = generateApiKey();

    expect(result.plaintext).toHaveLength(64);
    expect(result.plaintext).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should set prefix to first 8 chars of plaintext', () => {
    const result = generateApiKey();

    expect(result.prefix).toBe(result.plaintext.slice(0, 8));
    expect(result.prefix).toHaveLength(8);
  });

  it('should produce a SHA-256 hash (64-char hex)', () => {
    const result = generateApiKey();

    expect(result.hash).toHaveLength(64);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce different keys on each call', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1.plaintext).not.toBe(key2.plaintext);
    expect(key1.hash).not.toBe(key2.hash);
  });
});

// ============================================================================
// createApiKey
// ============================================================================

describe('createApiKey', () => {
  let repo: ApiKeyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should call repo.create with userId, name, keyPrefix, and keyHash', async () => {
    vi.mocked(repo.create).mockResolvedValue(createMockApiKey());

    await createApiKey(repo, 'user-1', { name: 'My Key' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        name: 'My Key',
        keyPrefix: expect.any(String),
        keyHash: expect.any(String),
      }),
    );
  });

  it('should return both apiKey record and plaintext', async () => {
    const mockKey = createMockApiKey();
    vi.mocked(repo.create).mockResolvedValue(mockKey);

    const result = await createApiKey(repo, 'user-1', { name: 'My Key' });

    expect(result.apiKey).toBe(mockKey);
    expect(result.plaintext).toHaveLength(64);
  });

  it('should pass scopes when provided', async () => {
    vi.mocked(repo.create).mockResolvedValue(createMockApiKey());

    await createApiKey(repo, 'user-1', { name: 'My Key', scopes: ['read', 'write'] });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ scopes: ['read', 'write'] }),
    );
  });

  it('should pass expiresAt when provided', async () => {
    vi.mocked(repo.create).mockResolvedValue(createMockApiKey());
    const expiresAt = new Date('2027-01-01');

    await createApiKey(repo, 'user-1', { name: 'My Key', expiresAt });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ expiresAt }));
  });

  it('should omit scopes and expiresAt when undefined', async () => {
    vi.mocked(repo.create).mockResolvedValue(createMockApiKey());

    await createApiKey(repo, 'user-1', { name: 'My Key' });

    const callArgs = vi.mocked(repo.create).mock.calls.at(0)?.at(0);
    expect(callArgs).not.toHaveProperty('scopes');
    expect(callArgs).not.toHaveProperty('expiresAt');
  });
});

// ============================================================================
// listApiKeys
// ============================================================================

describe('listApiKeys', () => {
  let repo: ApiKeyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should call repo.findByUserId and return result', async () => {
    const keys = [createMockApiKey(), createMockApiKey({ id: 'key-2' })];
    vi.mocked(repo.findByUserId).mockResolvedValue(keys);

    const result = await listApiKeys(repo, 'user-1');

    expect(repo.findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toBe(keys);
  });
});

// ============================================================================
// revokeApiKey
// ============================================================================

describe('revokeApiKey', () => {
  let repo: ApiKeyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should throw if key not found', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(revokeApiKey(repo, 'user-1', 'key-1')).rejects.toThrow('API key not found');
  });

  it('should throw if userId mismatch', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createMockApiKey({ userId: 'other-user' }));

    await expect(revokeApiKey(repo, 'user-1', 'key-1')).rejects.toThrow('API key not found');
  });

  it('should throw if already revoked', async () => {
    vi.mocked(repo.findById).mockResolvedValue(
      createMockApiKey({ userId: 'user-1', revokedAt: new Date() }),
    );

    await expect(revokeApiKey(repo, 'user-1', 'key-1')).rejects.toThrow(
      'API key is already revoked',
    );
  });

  it('should call repo.revoke on success', async () => {
    const revokedKey = createMockApiKey({ revokedAt: new Date() });
    vi.mocked(repo.findById).mockResolvedValue(createMockApiKey({ userId: 'user-1' }));
    vi.mocked(repo.revoke).mockResolvedValue(revokedKey);

    const result = await revokeApiKey(repo, 'user-1', 'key-1');

    expect(repo.revoke).toHaveBeenCalledWith('key-1');
    expect(result).toBe(revokedKey);
  });

  it('should throw if repo.revoke returns null', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createMockApiKey({ userId: 'user-1' }));
    vi.mocked(repo.revoke).mockResolvedValue(null);

    await expect(revokeApiKey(repo, 'user-1', 'key-1')).rejects.toThrow('Failed to revoke API key');
  });
});

// ============================================================================
// deleteApiKey
// ============================================================================

describe('deleteApiKey', () => {
  let repo: ApiKeyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should throw if key not found', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(deleteApiKey(repo, 'user-1', 'key-1')).rejects.toThrow('API key not found');
  });

  it('should throw if userId mismatch', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createMockApiKey({ userId: 'other-user' }));

    await expect(deleteApiKey(repo, 'user-1', 'key-1')).rejects.toThrow('API key not found');
  });

  it('should call repo.delete and return result', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createMockApiKey({ userId: 'user-1' }));
    vi.mocked(repo.delete).mockResolvedValue(true);

    const result = await deleteApiKey(repo, 'user-1', 'key-1');

    expect(repo.delete).toHaveBeenCalledWith('key-1');
    expect(result).toBe(true);
  });
});
