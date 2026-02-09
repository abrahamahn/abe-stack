// src/apps/web/src/features/settings/pages/SettingsPage.tsx
/**
 * Settings Page
 *
 * Main settings page with tabs for Profile, Security, Sessions, and Billing.
 */

import { Button, Card, Heading, Tabs } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks';
import { useMemo, type ReactElement } from 'react';

import {
  AvatarUpload,
  EmailChangeForm,
  ForgotPasswordShortcut,
  OAuthConnectionsList,
  PasswordChangeForm,
  ProfileForm,
  SessionsList,
  TotpManagement,
} from '../components';

import type { User } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

type UserLocal = User;

// ============================================================================
// Tab Content Components
// ============================================================================

const ProfileTab = ({ user }: { user: UserLocal }): ReactElement => {
  const displayName = `${user.firstName} ${user.lastName}`.trim();
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h3" size="md" className="mb-4">
          Avatar
        </Heading>
        <AvatarUpload currentAvatarUrl={user.avatarUrl ?? ''} userName={displayName} />
      </div>

      <div className="border-t pt-6">
        <Heading as="h3" size="md" className="mb-4">
          Profile Information
        </Heading>
        <ProfileForm user={user} />
      </div>
    </div>
  );
};

const SecurityTab = ({ user }: { user: UserLocal }): ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h3" size="md" className="mb-4">
          Two-Factor Authentication
        </Heading>
        <TotpManagement />
      </div>

      <div className="border-t pt-6">
        <Heading as="h3" size="md" className="mb-4">
          Change Password
        </Heading>
        <PasswordChangeForm />
        <div className="mt-6">
          <ForgotPasswordShortcut email={user.email} />
        </div>
      </div>

      <div className="border-t pt-6">
        <Heading as="h3" size="md" className="mb-4">
          Change Email
        </Heading>
        <EmailChangeForm />
      </div>

      <div className="border-t pt-6">
        <Heading as="h3" size="md" className="mb-4">
          Connected Accounts
        </Heading>
        <OAuthConnectionsList />
      </div>
    </div>
  );
};

const SessionsTab = (): ReactElement => {
  return (
    <div>
      <Heading as="h3" size="md" className="mb-4">
        Active Sessions
      </Heading>
      <p className="text-gray-500 text-sm mb-4">
        Manage your active sessions across devices. Revoking a session will log you out from that
        device.
      </p>
      <SessionsList />
    </div>
  );
};

const BillingTab = (): ReactElement => {
  return (
    <div>
      <Heading as="h3" size="md" className="mb-4">
        Billing
      </Heading>
      <p className="text-gray-500 text-sm mb-4">Manage your subscription and billing details.</p>
      <Card className="p-4">
        <p className="text-gray-500">
          Visit the{' '}
          <a href="/billing" className="text-blue-600 hover:text-blue-700 underline">
            Billing page
          </a>{' '}
          to manage your subscription.
        </p>
      </Card>
    </div>
  );
};

// ============================================================================
// Main Settings Page
// ============================================================================

export const SettingsPage = (): ReactElement => {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Determine page status:
  // - Show loading while auth is initializing OR while user data is being fetched
  // - Show success ONLY when we have the user object loaded
  // - Show error if not loading, not authenticated, and no user
  const status =
    isLoading || (isAuthenticated && user === null)
      ? 'pending'
      : user !== null
        ? 'success'
        : 'error';

  // Only treat as error if we're definitely not authenticated and not loading
  const error =
    !isLoading && user === null && !isAuthenticated ? new Error('Not authenticated') : null;

  // Mock refetch as a no-op since useAuth handles state primarily,
  // though typically you'd trigger a re-fetch via auth.initialize() or similar if needed.
  // For now, we can just reload the page or rely on the auth service's polling.
  const refetch = (): void => {
    window.location.reload();
  };

  // Build tabs
  const tabs = useMemo(
    () => [
      {
        id: 'profile',
        label: 'Profile',
        content: user !== null ? <ProfileTab user={user} /> : null,
      },
      {
        id: 'security',
        label: 'Security',
        content: user !== null ? <SecurityTab user={user} /> : null,
      },
      {
        id: 'sessions',
        label: 'Sessions',
        content: <SessionsTab />,
      },
      {
        id: 'billing',
        label: 'Billing',
        content: <BillingTab />,
      },
    ],
    [user],
  );

  // Loading state
  if (status === 'pending') {
    return (
      <div className="py-8 max-w-3xl mx-auto px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state - show friendly message for auth errors
  if (status === 'error' || user === null) {
    const errorMessage = error instanceof Error ? error.message : null;
    const isAuthError =
      (errorMessage?.includes('401') ?? false) || (errorMessage?.includes('Unauthorized') ?? false);

    return (
      <div className="py-8 max-w-3xl mx-auto px-4">
        <Card className="p-6 text-center">
          <Heading as="h2" size="lg" className="mb-4">
            {isAuthError ? 'Session Expired' : 'Unable to Load Settings'}
          </Heading>
          <p className="text-gray-500 mb-4">
            {isAuthError
              ? 'Your session has expired. Please log in again to access your settings.'
              : (errorMessage ?? 'Failed to load your profile. Please try again.')}
          </p>
          <Button
            type="button"
            variant="text"
            onClick={() => {
              if (isAuthError) {
                window.location.href = '/login';
              } else {
                refetch();
              }
            }}
            className="underline"
          >
            {isAuthError ? 'Go to Login' : 'Try Again'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-3xl mx-auto px-4">
      <Heading as="h1" size="xl" className="mb-6">
        Settings
      </Heading>

      <Card className="p-6">
        <Tabs items={tabs} />
      </Card>
    </div>
  );
};
