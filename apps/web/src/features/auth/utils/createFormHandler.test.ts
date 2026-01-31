// apps/web/src/features/auth/utils/createFormHandler.test.ts
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { createFormHandler } from './createFormHandler';

import type { Mock } from 'vitest';

describe('createFormHandler', () => {
  let mockSubmitFn: Mock;
  let mockSetErrors: Mock;
  let mockSetIsSubmitting: Mock;

  beforeEach(() => {
    mockSubmitFn = vi.fn();
    mockSetErrors = vi.fn();
    mockSetIsSubmitting = vi.fn();
  });

  const buildHandler = () => createFormHandler(mockSetIsSubmitting, mockSetErrors)(mockSubmitFn);

  test('should create a form handler that calls submit function', async () => {
    const mockData = { email: 'test@example.com', password: 'password123' };
    mockSubmitFn.mockResolvedValue({ success: true });

    const formHandler = buildHandler();

    await formHandler(mockData);

    expect(mockSetIsSubmitting).toHaveBeenCalledWith(true);
    expect(mockSubmitFn).toHaveBeenCalledWith(mockData);
    expect(mockSetIsSubmitting).toHaveBeenCalledWith(false);
  });

  test('should handle successful form submission', async () => {
    const mockData = { email: 'test@example.com', password: 'password123' };
    const mockResult = { success: true, user: { id: 'user-123' } };
    mockSubmitFn.mockResolvedValue(mockResult);

    const formHandler = buildHandler();

    const result = await formHandler(mockData);

    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(mockSubmitFn).toHaveBeenCalledWith(mockData);
    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(2, false);
    expect(result).toEqual(mockResult);
  });

  test('should handle form submission errors', async () => {
    const mockData = { email: 'test@example.com', password: 'password123' };
    const mockError = new Error('Invalid credentials');
    mockSubmitFn.mockRejectedValue(mockError);

    const formHandler = buildHandler();

    await expect(formHandler(mockData)).rejects.toThrow('Invalid credentials');

    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(mockSubmitFn).toHaveBeenCalledWith(mockData);
    expect(mockSetErrors).toHaveBeenCalledWith('Invalid credentials');
    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(2, false);
  });

  test('should handle non-error rejections', async () => {
    const mockData = { email: 'test@example.com', password: 'password123' };
    const validationError = {
      message: 'Validation failed',
      details: {
        email: 'Invalid email format',
        password: 'Password too weak',
      },
    };
    mockSubmitFn.mockRejectedValue(validationError);

    const formHandler = buildHandler();

    await expect(formHandler(mockData)).rejects.toEqual(validationError);

    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(mockSubmitFn).toHaveBeenCalledWith(mockData);
    expect(mockSetErrors).toHaveBeenCalledWith('An error occurred');
    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(2, false);
  });

  test('should clear errors before submission', async () => {
    const mockData = { email: 'test@example.com', password: 'password123' };
    mockSubmitFn.mockResolvedValue({ success: true });

    const formHandler = buildHandler();

    await formHandler(mockData);

    expect(mockSetErrors).toHaveBeenCalledWith(null);
  });

  test('should handle empty data submission', async () => {
    const mockData: Record<string, never> = {};
    mockSubmitFn.mockResolvedValue({ success: true });

    const formHandler = buildHandler();

    await formHandler(mockData);

    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(mockSubmitFn).toHaveBeenCalledWith(mockData);
    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(2, false);
  });

  test('should handle null data submission', async () => {
    const mockData: null = null;
    mockSubmitFn.mockResolvedValue({ success: true });

    const formHandler = buildHandler();

    await formHandler(mockData);

    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(mockSubmitFn).toHaveBeenCalledWith(null);
    expect(mockSetIsSubmitting).toHaveBeenNthCalledWith(2, false);
  });

  test('should maintain correct submission state sequence', async () => {
    const mockData = { email: 'test@example.com' };
    mockSubmitFn.mockResolvedValue({ success: true });

    const formHandler = buildHandler();

    // Spy on the sequence of calls
    const sequence: string[] = [];
    mockSetIsSubmitting.mockImplementation((state: boolean) => {
      sequence.push(state ? 'start' : 'end');
    });

    await formHandler(mockData);

    expect(sequence).toEqual(['start', 'end']);
  });

  test('should handle concurrent submissions gracefully', async () => {
    const mockData1 = { email: 'test1@example.com' };
    const mockData2 = { email: 'test2@example.com' };

    // Mock a slow submission
    mockSubmitFn.mockImplementation(
      (data: { email: string }) =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, data });
          }, 10);
        }),
    );

    const formHandler = buildHandler();

    // Trigger two submissions
    const promise1 = formHandler(mockData1);
    const promise2 = formHandler(mockData2);

    await Promise.all([promise1, promise2]);

    // Should have called setIsSubmitting multiple times
    expect(mockSetIsSubmitting).toHaveBeenCalledTimes(4); // start, end, start, end
  });
});
