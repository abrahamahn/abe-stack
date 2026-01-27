// apps/web/src/features/admin/services/adminApi.test.ts
import { describe, expect, it, vi } from 'vitest';

import { createAdminApi } from './adminApi';

describe('createAdminApi', () => {
  it('should create API client with config', () => {
    const mockFetch = vi.fn();
    const api = createAdminApi({
      baseUrl: 'https://api.example.com',
      getToken: () => 'token',
      fetchImpl: mockFetch as typeof fetch,
    });
    expect(api).toBeDefined();
    expect(api.getUsers).toBeInstanceOf(Function);
  });

  it('should handle user operations', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ users: [] }), { status: 200 })
      )
    );
    const api = createAdminApi({
      baseUrl: 'https://api.example.com',
      getToken: () => 'token',
      fetchImpl: mockFetch as typeof fetch,
    });
    await api.getUsers({ page: 1, limit: 10 });
    expect(mockFetch).toHaveBeenCalled();
  });
});
