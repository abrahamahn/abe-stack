// apps/web/src/features/billing/pages/BillingSettingsPage.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BillingSettingsPage } from './BillingSettingsPage';

vi.mock('@abe-stack/ui', () => {
  const Button = ({ children }: { children: React.ReactNode }): JSX.Element => <button>{children}</button>;
  const Card = ({ children }: { children: React.ReactNode }): JSX.Element => <div>{children}</div>;
  const Container = ({ children }: { children: React.ReactNode }): JSX.Element => <div>{children}</div>;
  const Heading = ({ children }: { children: React.ReactNode }): JSX.Element => <h1>{children}</h1>;
  return { Button, Card, Container, Heading };
});

describe('BillingSettingsPage', () => {
  it('should render', () => {
    const { container } = render(<BillingSettingsPage />);
    expect(container).toBeInTheDocument();
  });
});
