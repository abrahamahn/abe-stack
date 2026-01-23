// apps/web/src/features/admin/layouts/AdminLayout.tsx
/**
 * AdminLayout - Layout shell for all admin pages.
 *
 * Provides a left sidebar with navigation between admin sections
 * and renders child routes in the main content area.
 */

import { LeftSidebarLayout, Navigate, Outlet, ScrollArea, useLocation, useNavigate } from '@abe-stack/ui';
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

function UsersIcon(): ReactElement {
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
}

function ShieldIcon(): ReactElement {
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
}

function QueueIcon(): ReactElement {
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
}

function BillingIcon(): ReactElement {
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
}

// ============================================================================
// Navigation Items
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  { label: 'Users', path: '/admin/users', icon: <UsersIcon /> },
  { label: 'Security', path: '/admin/security', icon: <ShieldIcon /> },
  { label: 'Jobs', path: '/admin/jobs', icon: <QueueIcon /> },
  { label: 'Billing', path: '/admin/billing/plans', icon: <BillingIcon /> },
];

// ============================================================================
// Components
// ============================================================================

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        isActive
          ? 'bg-surface-2 text-text-primary font-medium'
          : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
      }`}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

function AdminSidebar(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <LeftSidebarLayout
      width="14rem"
      bordered
      header={
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Admin</h2>
          <p className="text-xs text-text-muted">Command Center</p>
        </div>
      }
      content={
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              isActive={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>
      }
      footer={
        <div className="p-3 border-t border-border">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-1 hover:text-text-primary"
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
          </button>
        </div>
      }
    />
  );
}

// ============================================================================
// AdminLayout
// ============================================================================

/**
 * Main admin layout with sidebar navigation.
 *
 * Checks for admin role and redirects to dashboard if not authorized.
 * Renders child routes in a scrollable main content area.
 */
export function AdminLayout({ children }: AdminLayoutProps): ReactElement {
  const { user, isLoading, isAuthenticated } = useAuth();

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
}
