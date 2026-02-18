// main/apps/web/src/features/auth/hooks/useAuthMutations.ts
import { useCallback, useState } from 'react';

import { useAuth } from './useAuth';

import type {
  EmailVerificationRequest,
  EmailVerificationResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from '@bslt/api';

// ============================================================================
// Types
// ============================================================================

interface MutationState<TData = void, TVariables = unknown> {
  mutate: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

// ============================================================================
// useVerifyEmail
// ============================================================================

export function useVerifyEmail(): MutationState<
  EmailVerificationResponse,
  EmailVerificationRequest
> {
  const { verifyEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const mutate = useCallback(
    async (data: EmailVerificationRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await verifyEmail(data);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [verifyEmail],
  );

  return { mutate, isLoading, error, reset };
}

// ============================================================================
// useLogin
// ============================================================================

export function useLogin(): MutationState<void, LoginRequest> {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const mutate = useCallback(
    async (data: LoginRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        await login(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [login],
  );

  return { mutate, isLoading, error, reset };
}

// ============================================================================
// useRegister
// ============================================================================

export function useRegister(): MutationState<RegisterResponse, RegisterRequest> {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const mutate = useCallback(
    async (data: RegisterRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await register(data);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [register],
  );

  return { mutate, isLoading, error, reset };
}
