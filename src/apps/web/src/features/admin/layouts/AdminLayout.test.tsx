// src/apps/web/src/features/admin/layouts/AdminLayout.test.tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  createMockEnvironment,
  mockAdminUser,
  renderWithProviders,
} from '../../../__tests__/utils';

import { AdminLayout } from './AdminLayout';

describe('AdminLayout', () => {
  it('should render children', () => {
    const environment = createMockEnvironment({
      user: mockAdminUser,
      isAuthenticated: true,
    });

    renderWithProviders(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      { environment },
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render navigation', () => {
    const environment = createMockEnvironment({
      user: mockAdminUser,
      isAuthenticated: true,
    });

    renderWithProviders(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>,
      { environment },
    );

    // The admin layout should have navigation
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
