// apps/web/src/features/auth/hooks/useAuth.test.ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from './useAuth';

vi.mock('@abe-stack/sdk', () => ({
  useQuery: vi.fn(() => ({
    data: { id: '1', email: 'test@example.com' },
    isLoading: false,
    error: null,
  })),
}));

describe('useAuth', () => {
  it('should return user data', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeDefined();
  });
});
