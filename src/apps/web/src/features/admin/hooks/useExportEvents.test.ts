// src/apps/web/src/features/admin/hooks/useExportEvents.test.ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Create hoisted mocks for ESM module compatibility
const mocks = vi.hoisted(() => ({
  mockUseMutation: vi.fn(),
  mockCreateAdminApiClient: vi.fn(),
  mockExportSecurityEvents: vi.fn(),
}));

vi.mock('@abe-stack/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/react')>();
  return {
    ...actual,
    useMutation: mocks.mockUseMutation,
  };
});

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: mocks.mockCreateAdminApiClient,
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    tokenStore: {
      get: vi.fn().mockReturnValue('mock-token'),
    },
  };
});

// Import after mocks are set up
import { useExportEvents } from './useExportEvents';

import type { UseMutationResult } from '@abe-stack/react';
import type { SecurityEventsExportResponse } from '@abe-stack/shared';

describe('useExportEvents', () => {
  const mockExportResponse: SecurityEventsExportResponse = {
    data: 'event1,event2\ndata1,data2',
    contentType: 'text/csv',
    filename: 'security-events.csv',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock DOM APIs for URL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Setup default admin client mock
    mocks.mockCreateAdminApiClient.mockReturnValue({
      exportSecurityEvents: mocks.mockExportSecurityEvents,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should export events with CSV format', () => {
    const mockMutate = vi.fn();

    mocks.mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn().mockResolvedValue(mockExportResponse),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    const { result } = renderHook(() => useExportEvents());

    act(() => {
      result.current.exportEvents('csv');
    });

    expect(mockMutate).toHaveBeenCalledWith({ format: 'csv' });
  });

  test('should export events with JSON format', () => {
    const mockMutate = vi.fn();

    mocks.mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn().mockResolvedValue(mockExportResponse),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    const { result } = renderHook(() => useExportEvents());

    act(() => {
      result.current.exportEvents('json');
    });

    expect(mockMutate).toHaveBeenCalledWith({ format: 'json' });
  });

  test('should export events with filter', () => {
    const mockMutate = vi.fn();

    mocks.mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn().mockResolvedValue(mockExportResponse),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    const { result } = renderHook(() => useExportEvents());

    const filter = { userId: 'user-123' };
    act(() => {
      result.current.exportEvents('csv', filter);
    });

    expect(mockMutate).toHaveBeenCalledWith({ format: 'csv', filter });
  });

  test('should return correct loading state', () => {
    mocks.mockUseMutation.mockReturnValue({
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
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    const { result } = renderHook(() => useExportEvents());

    expect(result.current.isExporting).toBe(true);
  });

  test('should return correct error state', () => {
    const mockError = new Error('Export failed');

    mocks.mockUseMutation.mockReturnValue({
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
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    const { result } = renderHook(() => useExportEvents());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  test('should return export data after successful export', () => {
    mocks.mockUseMutation.mockReturnValue({
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
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    const { result } = renderHook(() => useExportEvents());

    expect(result.current.data).toEqual(mockExportResponse);
  });

  test('should download export file', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue(mockExportResponse);
    const mockClick = vi.fn();

    mocks.mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    // Create mock link element
    const mockLink = document.createElement('a');
    mockLink.click = mockClick;

    // Spy on document methods
    // We cast the implementation function through unknown to bypass createElement's complex overloads
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((() => mockLink) as unknown as (typeof document)['createElement']);
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node);
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);

    const { result } = renderHook(() => useExportEvents());

    act(() => {
      result.current.downloadExport('csv');
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ format: 'csv' });
    });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    // Cleanup spies immediately
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  test('should handle download errors gracefully', () => {
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Export failed'));

    mocks.mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      data: null,
      error: new Error('Export failed'),
      isError: true,
      status: 'error',
      isPending: false,
      isSuccess: false,
      failureCount: 1,
      reset: vi.fn(),
    } as unknown as UseMutationResult<SecurityEventsExportResponse, Error, unknown>);

    const { result } = renderHook(() => useExportEvents());

    act(() => {
      result.current.downloadExport('csv');
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ format: 'csv' });
    // Error is handled silently in mutation state
  });
});
