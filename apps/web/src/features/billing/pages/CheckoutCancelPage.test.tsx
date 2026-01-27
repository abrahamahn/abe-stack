// apps/web/src/features/billing/pages/CheckoutCancelPage.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CheckoutCancelPage } from './CheckoutCancelPage';

vi.mock('@abe-stack/ui', () => {
  const Button = ({ children }: { children: React.ReactNode }): JSX.Element => <button>{children}</button>;
  const Container = ({ children }: { children: React.ReactNode }): JSX.Element => <div>{children}</div>;
  const Heading = ({ children }: { children: React.ReactNode }): JSX.Element => <h1>{children}</h1>;
  return { Button, Container, Heading };
});

describe('CheckoutCancelPage', () => {
  it('should render', () => {
    const { container } = render(<CheckoutCancelPage />);
    expect(container).toBeInTheDocument();
  });
});
