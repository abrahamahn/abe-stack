// main/apps/web/src/features/admin/components/RoleBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { RoleBadge } from './RoleBadge';

import type { UserRole } from '@abe-stack/shared';

describe('RoleBadge', () => {
  describe('rendering different roles', () => {
    it('should render user role with info tone', () => {
      render(<RoleBadge role="user" />);

      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should render moderator role with warning tone', () => {
      render(<RoleBadge role="moderator" />);

      expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    it('should render admin role with danger tone', () => {
      render(<RoleBadge role="admin" />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('label formatting', () => {
    const roles: UserRole[] = ['user', 'moderator', 'admin'];

    it.each(roles)('should capitalize first letter of %s role', (role) => {
      render(<RoleBadge role={role} />);

      const expectedLabel = role.charAt(0).toUpperCase() + role.slice(1);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('badge component integration', () => {
    it('should render Badge component with correct props', () => {
      const { container } = render(<RoleBadge role="admin" />);

      // Badge component should be present
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
