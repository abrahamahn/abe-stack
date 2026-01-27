// apps/web/src/features/admin/pages/JobMonitorPage.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobMonitorPage } from './JobMonitorPage';

vi.mock('@abe-stack/ui', () => {
  const mockButton = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  const mockCard = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const mockContainer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const mockHeading = ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>;
  return {
    Button: mockButton,
    Card: mockCard,
    Container: mockContainer,
    Heading: mockHeading,
  };
});

describe('JobMonitorPage', () => {
  it('should render', () => {
    const { container } = render(<JobMonitorPage />);
    expect(container).toBeInTheDocument();
  });
});
