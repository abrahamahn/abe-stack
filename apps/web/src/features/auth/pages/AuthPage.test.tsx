// apps/web/src/features/auth/pages/AuthPage.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthPage } from './AuthPage';

vi.mock('@abe-stack/ui', () => {
  const Container = ({ children }: { children: React.ReactNode }): JSX.Element => <div>{children}</div>;
  return { Container };
});

vi.mock('../components', () => {
  const AuthForms = (): JSX.Element => <div>Auth Forms</div>;
  return { AuthForms };
});

describe('AuthPage', () => {
  it('should render', () => {
    const { container } = render(<AuthPage />);
    expect(container).toBeInTheDocument();
  });
});
