// apps/web/src/features/auth/components/OAuthButtons.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OAuthButtons } from './OAuthButtons';

vi.mock('@abe-stack/ui', () => {
  const mockButton = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  return {
    Button: mockButton,
  };
});

describe('OAuthButtons', () => {
  it('should render', () => {
    const { container } = render(<OAuthButtons />);
    expect(container).toBeInTheDocument();
  });
});
