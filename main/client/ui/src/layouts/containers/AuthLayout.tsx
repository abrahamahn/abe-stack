// main/client/ui/src/layouts/containers/AuthLayout.tsx
import { Container } from '@containers/Container';
import '../../styles/layouts.css';

import type { ReactElement, ReactNode } from 'react';

type AuthLayoutProps = {
  /** Heading text or element displayed at the top of the auth card */
  title?: ReactNode;
  /** Subtitle or description displayed below the title */
  description?: ReactNode;
  /** Auth form content (e.g., login form, register form) */
  children: ReactNode;
};

/**
 * A centered card layout for authentication pages (login, register, forgot password).
 * Wraps content in a small container with optional title and description sections.
 *
 * @example
 * ```tsx
 * <AuthLayout title="Sign In" description="Welcome back">
 *   <LoginForm />
 * </AuthLayout>
 * ```
 */
export const AuthLayout = ({ title, description, children }: AuthLayoutProps): ReactElement => {
  return (
    <div className="auth-layout">
      <Container size="sm">
        <div className="auth-layout-card">
          {title !== undefined && title !== null ? (
            <h1 className="auth-layout-title">{title}</h1>
          ) : null}
          {description !== undefined && description !== null ? (
            <p className="auth-layout-description">{description}</p>
          ) : null}
          {children}
        </div>
      </Container>
    </div>
  );
};
