// src/apps/web/src/features/settings/pages/SettingsPage.tsx
/**
 * Settings Page
 *
 * Main settings page with tabs for Profile, Security, Sessions, Preferences, and more.
 */

import { Button, Card, Heading, Link, Skeleton, Tabs, Text } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks';
import { useMemo, type ReactElement } from 'react';

import {
  ApiKeysManagement,
  AvatarUpload,
  DataControlsSection,
  DangerZone,
  DevicesList,
  EmailChangeForm,
  ForgotPasswordShortcut,
  NotificationPreferencesForm,
  OAuthConnectionsList,
  PasswordChangeForm,
  PhoneManagement,
  PreferencesSection,
  ProfileCompleteness,
  ProfileForm,
  SessionsList,
  TotpManagement,
  UsernameForm,
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
      <ProfileCompleteness className="mb-4" />

      <div>
        <Heading as="h3" size="md" className="mb-4">
          Avatar
        </Heading>
        <AvatarUpload currentAvatarUrl={user.avatarUrl ?? ''} userName={displayName} />
      </div>

      <div className="border-t pt-6">
        <Heading as="h3" size="md" className="mb-4">
          Username
        </Heading>
        <UsernameForm currentUsername={user.username} />
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
          SMS Authentication
        </Heading>
        <PhoneManagement user={user} baseUrl="" getToken={undefined} />
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

      <div className="border-t pt-6">
        <ApiKeysManagement />
      </div>
    </div>
  );
};

const SessionsTab = (): ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h3" size="md" className="mb-4">
          Active Sessions
        </Heading>
        <Text tone="muted" size="sm" className="mb-4">
          Manage your active sessions across devices. Revoking a session will log you out from that
          device.
        </Text>
        <SessionsList />
      </div>

      <div className="border-t pt-6">
        <Heading as="h3" size="md" className="mb-4">
          Known Devices
        </Heading>
        <Text tone="muted" size="sm" className="mb-4">
          Devices are tracked when you log in. You can trust devices to skip new device alerts, or
          remove devices you no longer use.
        </Text>
        <DevicesList baseUrl="" getToken={undefined} />
      </div>
    </div>
  );
};

const NotificationsTab = (): ReactElement => {
  return (
    <div>
      <Heading as="h3" size="md" className="mb-4">
        Notification Preferences
      </Heading>
      <Text tone="muted" size="sm" className="mb-4">
        Control how and when you receive notifications.
      </Text>
      <NotificationPreferencesForm />
    </div>
  );
};

const AccountTab = (): ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h3" size="md" className="mb-4">
          Account Management
        </Heading>
        <Text tone="muted" size="sm" className="mb-4">
          Manage your account status. Destructive actions require password confirmation.
        </Text>
      </div>
      <DangerZone />
    </div>
  );
};

const BillingTab = (): ReactElement => {
  return (
    <div>
      <Heading as="h3" size="md" className="mb-4">
        Billing
      </Heading>
      <Text tone="muted" size="sm" className="mb-4">
        Manage your subscription and billing details.
      </Text>
      <Card className="p-4">
        <Text tone="muted">
          Visit the{' '}
          <Link to="/billing" className="text-link">
            Billing page
          </Link>{' '}
          to manage your subscription.
        </Text>
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
        id: 'notifications',
        label: 'Notifications',
        content: <NotificationsTab />,
      },
      {
        id: 'preferences',
        label: 'Preferences',
        content: (
          <div>
            <Heading as="h3" size="md" className="mb-4">
              Preferences
            </Heading>
            <Text tone="muted" size="sm" className="mb-4">
              Customize the application appearance and behavior.
            </Text>
            <PreferencesSection />
          </div>
        ),
      },
      {
        id: 'account',
        label: 'Account',
        content: <AccountTab />,
      },
      {
        id: 'data-controls',
        label: 'Data Controls',
        content: (
          <div>
            <Heading as="h3" size="md" className="mb-4">
              Data Controls
            </Heading>
            <Text tone="muted" size="sm" className="mb-4">
              Manage your account status and personal data.
            </Text>
            <DataControlsSection />
          </div>
        ),
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state - show friendly message for auth errors
  if (status === 'error' || user === null) {
    const errorMessage = error instanceof Error ? error.message : null;
    const isAuthError =
      (errorMessage?.includes('401') ?? false) || (errorMessage?.includes('Unauthorized') ?? false);

    return (
      <Card className="p-6 text-center">
        <Heading as="h2" size="lg" className="mb-4">
          {isAuthError ? 'Session Expired' : 'Unable to Load Settings'}
        </Heading>
        <Text tone="muted" className="mb-4">
          {isAuthError
            ? 'Your session has expired. Please log in again to access your settings.'
            : (errorMessage ?? 'Failed to load your profile. Please try again.')}
        </Text>
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
    );
  }

  return <Tabs items={tabs} />;
};
