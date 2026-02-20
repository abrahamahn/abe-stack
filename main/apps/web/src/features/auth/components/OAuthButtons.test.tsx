// main/apps/web/src/features/auth/components/OAuthButtons.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OAuthButtons } from './OAuthButtons';

vi.mock('@bslt/ui', () => {
  const mockButton = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Button: mockButton,
    OAuthButton: mockButton,
  };
});

vi.mock('@bslt/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/react')>();
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
