// apps/web/src/features/billing/pages/PricingPage.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PricingPage } from './PricingPage';

vi.mock('@abe-stack/ui', () => {
  const Container = ({ children }: { children: React.ReactNode }): JSX.Element => <div>{children}</div>;
  const Heading = ({ children }: { children: React.ReactNode }): JSX.Element => <h1>{children}</h1>;
  const PricingTable = (): JSX.Element => <div>Pricing Table</div>;
  return { Container, Heading, PricingTable };
});

describe('PricingPage', () => {
  it('should render', () => {
    const { container } = render(<PricingPage />);
    expect(container).toBeInTheDocument();
  });
});
