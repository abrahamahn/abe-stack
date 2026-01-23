// apps/web/src/features/admin/api/__tests__/adminApi.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { adminApi } from '../adminApi';

vi.mock('@config', () => ({
  clientConfig: { apiUrl: 'http://localhost:3000' },
}));

describe('adminApi', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
  });

  const mockJsonResponse = (data: unknown) => ({
    ok: true,
    json: vi.fn().mockResolvedValue(data),
  }) as unknown as Response;

  test('listUsers should call list endpoint with query params', async () => {
    const response = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    fetchMock.mockResolvedValue(mockJsonResponse(response));

    const result = await adminApi.listUsers({ page: 1, limit: 10, search: 'test' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/users?search=test&page=1&limit=10',
      expect.objectContaining({ method: undefined, credentials: 'include' }),
    );
    expect(result).toEqual(response);
  });

  test('getUser should call user endpoint', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    fetchMock.mockResolvedValue(mockJsonResponse(mockUser));

    const result = await adminApi.getUser('user-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/users/user-123',
      expect.objectContaining({ method: undefined, credentials: 'include' }),
    );
    expect(result).toEqual(mockUser);
  });

  test('updateUser should POST update payload', async () => {
    const payload = { name: 'Updated Name' };
    const mockResponse = { success: true };
    fetchMock.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await adminApi.updateUser('user-123', payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/users/user-123/update',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
    expect(result).toEqual(mockResponse);
  });

  test('lockUser should POST lock payload', async () => {
    const payload = { reason: 'Violation', durationMinutes: 60 };
    const mockResponse = { success: true };
    fetchMock.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await adminApi.lockUser('user-123', payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/users/user-123/lock',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
    expect(result).toEqual(mockResponse);
  });

  test('unlockUser should POST unlock payload', async () => {
    const payload = { email: 'test@example.com', reason: 'Verified' };
    const mockResponse = { success: true };
    fetchMock.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await adminApi.unlockUser('user-123', payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/users/user-123/unlock',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
    expect(result).toEqual(mockResponse);
  });
});
