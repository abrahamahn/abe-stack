// apps/web/src/features/auth/components/AuthModal.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthModal } from './AuthModal';

vi.mock('@abe-stack/ui', () => {
  const mockModal = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Modal: mockModal,
  };
});

vi.mock('./AuthForms', () => {
  const mockAuthForms = () => <div>Auth Forms</div>;
  return {
    AuthForms: mockAuthForms,
  };
});

describe('AuthModal', () => {
  it('should render', () => {
    const { container } = render(<AuthModal open={true} onOpenChange={vi.fn()} />);
    expect(container).toBeInTheDocument();
  });
});
