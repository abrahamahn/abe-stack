// apps/web/src/features/admin/layouts/AdminLayout.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayout } from './AdminLayout';

vi.mock('@abe-stack/ui', () => {
  const mockContainer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Container: mockContainer,
  };
});

describe('AdminLayout', () => {
  it('should render children', () => {
    const { getByText } = render(<AdminLayout><div>Test Content</div></AdminLayout>);
    expect(getByText('Test Content')).toBeInTheDocument();
  });
});
