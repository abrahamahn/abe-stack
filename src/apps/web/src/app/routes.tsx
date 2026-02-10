// src/apps/web/src/app/routes.tsx
import { Outlet, ProtectedRoute } from '@abe-stack/ui';
import { useAuth } from '@features/auth';
import {
  AdminLayout,
  JobMonitorPage,
  PlanManagementPage,
  RouteManifestPage,
  SecurityEventDetailPage,
  SecurityEventsPage,
  UserDetailPage,
  UserListPage,
} from '@pages/AdminPages';
import {
  AuthPage,
  ConfirmEmailChangePage,
  ConfirmEmailPage,
  ConnectedAccountsPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  RevertEmailChangePage,
} from '@pages/AuthPages';
import {
  BillingSettingsPage,
  CheckoutCancelPage,
  CheckoutSuccessPage,
  PricingPage,
} from '@pages/BillingPages';
import { DashboardPage } from '@pages/DashboardPage';
import { HomePage } from '@pages/HomePage';
import { SettingsPage } from '@pages/SettingsPage';
import {
  AcceptInvitationPage,
  WorkspaceDetailPage,
  WorkspaceListPage,
} from '@pages/WorkspacePages';
import { UILibraryPage } from '@ui-library';

import { AppLayout, AppSidePeekPage } from './layouts';

import type { ElementType, ReactElement } from 'react';

// Define a type for our route objects to ensure consistency
export interface AppRoute {
  path?: string;
  index?: boolean;
  element: ElementType;
  children?: AppRoute[];
  protected?: boolean; // Custom property for ProtectedRoute
}

// Wrapper component to apply ProtectedRoute logic
function ProtectedRouteWrapper(): ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
      <Outlet />
    </ProtectedRoute>
  );
}

export const appRoutes: AppRoute[] = [
  {
    path: '/side-peek-ui-library',
    element: AppSidePeekPage,
  },
  {
    path: '/',
    element: AppLayout,
    children: [
      {
        index: true,
        element: HomePage,
      },
      {
        path: 'clean',
        element: HomePage,
      },
      {
        path: 'ui-library',
        element: UILibraryPage,
      },
      {
        path: 'login',
        element: LoginPage,
      },
      {
        path: 'register',
        element: RegisterPage,
      },
      {
        path: 'auth',
        element: AuthPage,
      },
      {
        path: 'auth/reset-password',
        element: ResetPasswordPage,
      },
      {
        path: 'auth/confirm-email',
        element: ConfirmEmailPage,
      },
      {
        path: 'auth/change-email/confirm',
        element: ConfirmEmailChangePage,
      },
      {
        path: 'auth/change-email/revert',
        element: RevertEmailChangePage,
      },
      {
        path: 'settings',
        element: SettingsPage,
      },
      {
        path: 'pricing',
        element: PricingPage,
      },
      {
        element: ProtectedRouteWrapper, // Use a wrapper to handle isAuthenticated/isLoading
        protected: true, // Indicate that this route requires protection
        children: [
          {
            path: 'dashboard',
            element: DashboardPage,
          },
          {
            path: 'settings/accounts',
            element: ConnectedAccountsPage,
          },
          {
            path: 'settings/billing',
            element: BillingSettingsPage,
          },
          {
            path: 'billing/success',
            element: CheckoutSuccessPage,
          },
          {
            path: 'billing/cancel',
            element: CheckoutCancelPage,
          },
          {
            path: 'workspaces',
            element: WorkspaceListPage,
          },
          {
            path: 'workspaces/:id',
            element: WorkspaceDetailPage,
          },
          {
            path: 'invitations/accept',
            element: AcceptInvitationPage,
          },
        ],
      },
      {
        path: 'admin',
        element: AdminLayout,
        children: [
          {
            index: true,
            element: UserListPage,
          },
          {
            path: 'users',
            element: UserListPage,
          },
          {
            path: 'users/:id',
            element: UserDetailPage,
          },
          {
            path: 'security',
            element: SecurityEventsPage,
          },
          {
            path: 'security/:id',
            element: SecurityEventDetailPage,
          },
          {
            path: 'jobs',
            element: JobMonitorPage,
          },
          {
            path: 'billing/plans',
            element: PlanManagementPage,
          },
          {
            path: 'routes',
            element: RouteManifestPage,
          },
        ],
      },
    ],
  },
];
