// main/server/db/src/__tests__/rls.unit.test.ts
import { describe, expect, it, vi } from 'vitest';

import { createDbFromSql } from '../client';

describe('RLS Session Client', () => {
  it('should execute SET LOCAL before the query when a session is present', async () => {
    const mockUnsafe = vi.fn().mockResolvedValue([]);
    const mockBegin = vi.fn().mockImplementation((cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        unsafe: mockUnsafe,
      };
      return cb(tx);
    });

    const mockSql = {
      unsafe: mockUnsafe,
      begin: mockBegin,
    };

    const sessionClient = createDbFromSql(mockSql as never, {
      userId: 'user-123',
      tenantId: 'tenant-456',
      role: 'user',
    });

    await sessionClient.query({ text: 'SELECT * FROM users', values: [] });

    // Verify SET LOCAL calls
    expect(mockUnsafe).toHaveBeenCalledWith("SET LOCAL app.user_id = 'user-123'");
    expect(mockUnsafe).toHaveBeenCalledWith("SET LOCAL app.tenant_id = 'tenant-456'");
    expect(mockUnsafe).toHaveBeenCalledWith("SET LOCAL app.role = 'user'");

    // Verify final query
    expect(mockUnsafe).toHaveBeenCalledWith('SELECT * FROM users', expect.any(Array));

    // Check order (approximate check via call index)
    const calls = mockUnsafe.mock.calls as string[][];
    expect(calls[0]?.[0]).toContain('SET LOCAL app.user_id');
    expect(calls[1]?.[0]).toContain('SET LOCAL app.tenant_id');
    expect(calls[2]?.[0]).toContain('SET LOCAL app.role');
    expect(calls[3]?.[0]).toBe('SELECT * FROM users');
  });

  it('should NOT use a transaction if no session is provided', async () => {
    const mockUnsafe = vi.fn().mockResolvedValue([]);
    const mockSql = {
      unsafe: mockUnsafe,
    };

    const regularClient = createDbFromSql(mockSql as never);

    await regularClient.query({ text: 'SELECT * FROM users', values: [] });

    expect(mockUnsafe).toHaveBeenCalledTimes(1);
    expect(mockUnsafe).toHaveBeenCalledWith('SELECT * FROM users', []);
  });
});
