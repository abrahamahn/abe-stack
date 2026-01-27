// apps/web/src/features/auth/pages/ConnectedAccountsPage.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectedAccountsPage } from './ConnectedAccountsPage';

vi.mock('@abe-stack/ui', () => {
  const Container = ({ children }: { children: React.ReactNode }): JSX.Element => <div>{children}</div>;
  const Heading = ({ children }: { children: React.ReactNode }): JSX.Element => <h1>{children}</h1>;
  return { Container, Heading };
});

vi.mock('@settings/components', () => {
  const OAuthConnectionsList = (): JSX.Element => <div>OAuth Connections</div>;
  return { OAuthConnectionsList };
});

describe('ConnectedAccountsPage', () => {
  it('should render', () => {
    const { container } = render(<ConnectedAccountsPage />);
    expect(container).toBeInTheDocument();
  });
});
