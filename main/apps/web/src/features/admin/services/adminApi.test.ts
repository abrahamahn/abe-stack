// main/apps/web/src/features/admin/services/adminApi.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createAdminApiClient } from './adminApi';

describe('createAdminApiClient', () => {
  it('should create API client with config', () => {
    const mockFetch = vi.fn();
    const api = createAdminApiClient({
      baseUrl: 'https://api.example.com',
      getToken: () => 'token',
      fetchImpl: mockFetch as typeof fetch,
    });
    expect(api).toBeDefined();
    expect(api.listSecurityEvents).toBeInstanceOf(Function);
  });

  it('should handle security event operations', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ events: [], total: 0 }), { status: 200 })),
    );
    const api = createAdminApiClient({
      baseUrl: 'https://api.example.com',
      getToken: () => 'token',
      fetchImpl: mockFetch as typeof fetch,
    });
    await api.listSecurityEvents({ page: 1, limit: 10 });
    expect(mockFetch).toHaveBeenCalled();
  });
});
