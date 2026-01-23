// apps/web/src/features/auth/hooks/__tests__/useAuthFormState.test.ts
import { useFormState } from '@abe-stack/ui';
import { describe, expect, it } from 'vitest';

import { useAuthFormState } from '../useAuthFormState';

import type { AuthFormState } from '../useAuthFormState';
import type { FormState } from '@abe-stack/ui';

describe('useAuthFormState', () => {
  it('is a re-export of useFormState from @abe-stack/ui', () => {
    expect(useAuthFormState).toBe(useFormState);
  });

  it('has the expected function signature', () => {
    expect(typeof useAuthFormState).toBe('function');
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
      wrapHandler: <T, R>(handler: (data: T) => Promise<R>) =>
        handler,
    };

    // This assignment should compile without error
    const authFormState: AuthFormState = formState;
    const backToFormState: FormState = authFormState;

    expect(authFormState).toEqual(formState);
    expect(backToFormState).toEqual(authFormState);
  });
});
