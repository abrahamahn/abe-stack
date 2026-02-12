// src/client/api/src/api-keys/client.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiKeysClient } from './client';

describe('createApiKeysClient', () => {
  const baseUrl = 'https://api.example.com';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createClient = (token?: string) =>
    createApiKeysClient({
      baseUrl,
      getToken: token !== undefined ? () => token : () => null,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

  it('lists API keys', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ apiKeys: [] }),
    });

    const client = createClient('token');
    const response = await client.list();

    expect(response).toEqual({ apiKeys: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/users/me/api-keys',
      expect.any(Object),
    );
  });

  it('creates API key', async () => {
    const payload = { name: 'CI', scopes: ['read'] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ apiKey: { id: 'k1' }, plaintext: 'abe_test' }),
    });

    const client = createClient('token');
    await client.create(payload);

    const call = mockFetch.mock.calls[0];
    if (call === undefined) throw new Error('Expected fetch call');
    expect(call[0]).toBe('https://api.example.com/api/users/me/api-keys/create');
    expect(call[1]).toEqual(
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });

  it('revokes API key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ apiKey: { id: 'k1' } }),
    });

    const client = createClient('token');
    await client.revoke('k1');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/users/me/api-keys/k1/revoke',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deletes API key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok' }),
    });

    const client = createClient('token');
    await client.remove('k1');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/users/me/api-keys/k1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces api errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });

    const client = createClient();
    await expect(client.list()).rejects.toThrow('Unauthorized');
  });
});
