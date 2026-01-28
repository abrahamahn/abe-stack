// apps/web/src/features/auth/hooks/useAuthFormState.test.ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAuthFormState } from './useAuthFormState';

import type { AuthFormState } from './useAuthFormState';
import type { FormState } from '@abe-stack/ui';

describe('useAuthFormState', () => {
  it('has the expected function signature', () => {
    expect(typeof useAuthFormState).toBe('function');
  });

  it('returns expected state shape with default values', () => {
    const { result } = renderHook(() => useAuthFormState());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.setIsLoading).toBe('function');
    expect(typeof result.current.setError).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.wrapHandler).toBe('function');
  });

  it('setIsLoading updates isLoading state', () => {
    const { result } = renderHook(() => useAuthFormState());

    act(() => {
      result.current.setIsLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setIsLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('setError and clearError manage error state', () => {
    const { result } = renderHook(() => useAuthFormState());

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe('AuthFormState type', () => {
  it('is compatible with FormState from @abe-stack/ui', () => {
    // Type-level test: AuthFormState should be assignable to/from FormState
    const formState: FormState = {
      isLoading: false,
      error: null,
      setIsLoading: () => undefined,
      setError: () => undefined,
      clearError: () => undefined,
      wrapHandler: <T, R>(handler: (data: T) => Promise<R>) => handler,
    };

    // This assignment should compile without error
    const authFormState: AuthFormState = formState;
    const backToFormState: FormState = authFormState;

    expect(authFormState).toEqual(formState);
    expect(backToFormState).toEqual(authFormState);
  });
});
