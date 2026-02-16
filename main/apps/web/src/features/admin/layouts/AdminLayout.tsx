// main/apps/web/src/features/admin/layouts/AdminLayout.tsx
/**
 * AdminLayout - Layout shell for all admin pages.
 *
 * Provides a left sidebar with navigation between admin sections
 * and renders child routes in the main content area.
 */

import { Navigate, Outlet, useLocation, useNavigate } from '@abe-stack/react/router';
import { Button, Heading, LeftSidebarLayout, ScrollArea, Text } from '@abe-stack/ui';
import { useAuth } from '@features/auth';

import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

interface AdminLayoutProps {
  children?: ReactNode;
}

// ============================================================================
// Icons (Simple inline SVGs)
// ============================================================================

const UsersIcon = (): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
};

const ShieldIcon = (): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
};

const QueueIcon = (): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
};

const BillingIcon = (): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
};

// ============================================================================
// Navigation Items
// ============================================================================

const RoutesIcon = (): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16" />
      <path d="M4 12h16" />
      <path d="M4 20h10" />
      <circle cx="18" cy="20" r="2" />
    </svg>
  );
};

const AuditIcon = (): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
};

const FlagIcon = (): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Users', path: '/admin/users', icon: <UsersIcon /> },
  { label: 'Security', path: '/admin/security', icon: <ShieldIcon /> },
  { label: 'Audit Log', path: '/admin/audit', icon: <AuditIcon /> },
  { label: 'Feature Flags', path: '/admin/feature-flags', icon: <FlagIcon /> },
  { label: 'Jobs', path: '/admin/jobs', icon: <QueueIcon /> },
  { label: 'Billing', path: '/admin/billing/plans', icon: <BillingIcon /> },
  { label: 'API Routes', path: '/admin/routes', icon: <RoutesIcon /> },
];

// ============================================================================
// Components
// ============================================================================

const NavButton = ({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}): ReactElement => {
  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'text'}
      size="small"
      onClick={onClick}
      className={`w-full justify-start gap-3 ${isActive ? 'font-medium' : ''}`}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <Text as="span">{item.label}</Text>
    </Button>
  );
};

const AdminSidebar = (): ReactElement => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <LeftSidebarLayout
      width="14rem"
      bordered
      header={
        <div className="p-4 border-b border-border">
          <Heading as="h2" className="text-lg font-semibold text-text-primary">
            Admin
          </Heading>
          <Text className="text-xs text-text-muted">Command Center</Text>
        </div>
      }
      content={
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              isActive={location.pathname.startsWith(item.path)}
              onClick={() => {
                navigate(item.path);
              }}
            />
          ))}
        </nav>
      }
      footer={
        <div className="p-3 border-t border-border">
          <Button
            type="button"
            onClick={() => {
              navigate('/dashboard');
            }}
            variant="text"
            size="small"
            className="w-full justify-start gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to App
          </Button>
        </div>
      }
    />
  );
};

// ============================================================================
// AdminLayout
// ============================================================================

/**
 * Main admin layout with sidebar navigation.
 *
 * Checks for admin role and redirects to dashboard if not authorized.
 * Renders child routes in a scrollable main content area.
 */
export const AdminLayout = ({ children }: AdminLayoutProps): ReactElement => {
  const authResult = useAuth();
  const user = authResult.user as { role?: string } | null | undefined;
  const { isLoading, isAuthenticated } = authResult;

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if not admin
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-surface-0">
      <AdminSidebar />
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">{children ?? <Outlet />}</div>
        </ScrollArea>
      </main>
    </div>
  );
};
