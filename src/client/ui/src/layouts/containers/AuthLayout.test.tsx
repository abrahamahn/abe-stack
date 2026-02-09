// src/client/ui/src/layouts/containers/AuthLayout.test.tsx
// client/ui/src/layouts/__tests__/AuthLayout.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('renders title, description, and children', () => {
    render(
      <AuthLayout title="Sign in" description="Access your account">
        <div>Form</div>
      </AuthLayout>,
    );

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Access your account')).toBeInTheDocument();
    expect(screen.getByText('Form')).toBeInTheDocument();
  });

  it('renders without optional slots', () => {
    render(
      <AuthLayout>
        <div>Form</div>
      </AuthLayout>,
    );

    expect(screen.getByText('Form')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('handles special characters in content safely', () => {
    render(
      <AuthLayout title={'<script>alert("x")</script>'}>
        <div>Body</div>
      </AuthLayout>,
    );

    expect(screen.getByText('<script>alert("x")</script>')).toBeInTheDocument();
  });
});
