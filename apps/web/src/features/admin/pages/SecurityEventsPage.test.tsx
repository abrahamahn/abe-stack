// apps/web/src/features/admin/pages/SecurityEventsPage.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SecurityEventsPage } from './SecurityEventsPage';

vi.mock('@abe-stack/ui', () => {
  const mockContainer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const mockHeading = ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>;
  return {
    Container: mockContainer,
    Heading: mockHeading,
  };
});

describe('SecurityEventsPage', () => {
  it('should render', () => {
    const { container } = render(<SecurityEventsPage />);
    expect(container).toBeInTheDocument();
  });
});
