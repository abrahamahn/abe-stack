// main/apps/web/src/features/auth/components/OAuthButtons.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { OAuthButtons } from './OAuthButtons';

vi.mock('@abe-stack/ui', () => {
  const mockButton = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  return {
    Button: mockButton,
    OAuthButton: mockButton,
  };
});

vi.mock('@abe-stack/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/react')>();
  return {
    ...actual,
    useEnabledOAuthProviders: () => ({
      providers: [],
      isLoading: false,
      error: null,
    }),
    getOAuthLoginUrl: (baseUrl: string, provider: string) => `${baseUrl}/auth/${provider}`,
  };
});

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: {
      apiUrl: 'http://localhost:3000',
    },
  }),
}));

describe('OAuthButtons', () => {
  it('should render', () => {
    const { container } = render(<OAuthButtons />);
    expect(container).toBeInTheDocument();
  });
});
