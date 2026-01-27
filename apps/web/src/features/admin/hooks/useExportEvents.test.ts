// apps/web/src/features/admin/hooks/useExportEvents.test.ts
import { useMutation } from '@abe-stack/sdk';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminApiClient } from '../services/adminApi';

import { useExportEvents } from './useExportEvents';

import type { AdminApiClient } from '../services/adminApi';
import type { SecurityEventsExportResponse } from '@abe-stack/core';
import type { UseMutationResult } from '@abe-stack/sdk';

vi.mock('@abe-stack/sdk', () => ({
  useMutation: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

vi.mock('@abe-stack/core', () => ({
  tokenStore: {
    get: vi.fn().mockReturnValue('mock-token'),
  },
}));

describe('useExportEvents', () => {
  const mockExportResponse: SecurityEventsExportResponse = {
    data: 'event1,event2\ndata1,data2',
    contentType: 'text/csv',
    filename: 'security-events.csv',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock DOM APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
          remove: vi.fn(),
        } as unknown as HTMLElement;
      }
      return document.createElement(tag);
    });
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  test('should export events with CSV format', () => {
    const mutate = vi.fn();
    vi.mocked(useMutation).mockReturnValue({
      mutate,
      mutateAsync: vi.fn().mockResolvedValue(mockExportResponse),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn().mockResolvedValue(mockExportResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    result.current.exportEvents('csv');

    expect(mutate).toHaveBeenCalledWith({ format: 'csv' });
  });

  test('should export events with JSON format', () => {
    const mutate = vi.fn();
    vi.mocked(useMutation).mockReturnValue({
      mutate,
      mutateAsync: vi.fn().mockResolvedValue(mockExportResponse),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn().mockResolvedValue(mockExportResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    result.current.exportEvents('json');

    expect(mutate).toHaveBeenCalledWith({ format: 'json' });
  });

  test('should export events with filter', () => {
    const mutate = vi.fn();
    vi.mocked(useMutation).mockReturnValue({
      mutate,
      mutateAsync: vi.fn().mockResolvedValue(mockExportResponse),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn().mockResolvedValue(mockExportResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    const filter = { userId: 'user-123' };
    result.current.exportEvents('csv', filter);

    expect(mutate).toHaveBeenCalledWith({ format: 'csv', filter });
  });

  test('should download export file', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(mockExportResponse);
    vi.mocked(useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync,
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn().mockResolvedValue(mockExportResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    result.current.downloadExport('csv');

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ format: 'csv' });
    });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  test('should handle download errors gracefully', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Export failed'));
    vi.mocked(useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync,
      data: null,
      error: new Error('Export failed'),
      isError: true,
      status: 'error',
      isPending: false,
      isSuccess: false,
      failureCount: 1,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn().mockRejectedValue(new Error('Export failed')),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    await result.current.downloadExport('csv');

    expect(mutateAsync).toHaveBeenCalledWith({ format: 'csv' });
    // Error is handled silently in mutation state
  });

  test('should return correct loading state', () => {
    vi.mocked(useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: null,
      isError: false,
      status: 'pending',
      isPending: true,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    expect(result.current.isExporting).toBe(true);
  });

  test('should return correct error state', () => {
    const mockError = new Error('Export failed');
    vi.mocked(useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: mockError,
      isError: true,
      status: 'error',
      isPending: false,
      isSuccess: false,
      failureCount: 1,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  test('should return export data after successful export', () => {
    vi.mocked(useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: mockExportResponse,
      error: null,
      isError: false,
      status: 'success',
      isPending: false,
      isSuccess: true,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      exportSecurityEvents: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useExportEvents());

    expect(result.current.data).toEqual(mockExportResponse);
  });
});
