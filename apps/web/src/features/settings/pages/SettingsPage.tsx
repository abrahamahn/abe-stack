// apps/web/src/features/settings/pages/SettingsPage.tsx
/**
 * Settings Page
 *
 * Main settings page with tabs for Profile, Security, Sessions, and Billing.
 */

import { useQuery } from '@abe-stack/client';
import { Button, Card, Container, Heading, Tabs } from '@abe-stack/ui';
import { useMemo, type ReactElement } from 'react';

import {
  AvatarUpload,
  OAuthConnectionsList,
  PasswordChangeForm,
  ProfileForm,
  SessionsList,
} from '../components';

// ============================================================================
// Types
// ============================================================================

interface UserLocal {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'moderator';
  createdAt: string;
}

// ============================================================================
// Tab Content Components
// ============================================================================

const ProfileTab = ({ user }: { user: UserLocal }): ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h3" size="md" className="mb-4">
          Avatar
        </Heading>
        <AvatarUpload currentAvatarUrl={user.avatarUrl ?? ''} userName={user.name ?? ''} />
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

const SecurityTab = (): ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h3" size="md" className="mb-4">
          Change Password
        </Heading>
        <PasswordChangeForm />
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
  // Fetch current user
  const apiBaseUrl =
    typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';
  const queryResult = useQuery<UserLocal>({
    queryKey: ['user', 'me'],
    queryFn: async (): Promise<UserLocal> => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${apiBaseUrl}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = (await response.json()) as UserLocal;
      return data;
    },
  });

  const user = queryResult.data;
  const { status, error, refetch } = queryResult;

  // Build tabs
  const tabs = useMemo(
    () => [
      {
        id: 'profile',
        label: 'Profile',
        content: user !== undefined ? <ProfileTab user={user} /> : null,
      },
      {
        id: 'security',
        label: 'Security',
        content: <SecurityTab />,
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
      <Container className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>
      </Container>
    );
  }

  // Error state
  if (status === 'error' || user === undefined) {
    return (
      <Container className="py-8">
        <Card className="p-6 text-center">
          <Heading as="h2" size="lg" className="mb-4">
            Unable to Load Settings
          </Heading>
          <p className="text-gray-500 mb-4">
            {error?.message ?? 'Failed to load your profile. Please try again.'}
          </p>
          <Button
            type="button"
            variant="text"
            onClick={() => {
              void refetch();
            }}
            className="underline"
          >
            Try Again
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-3xl">
      <Heading as="h1" size="xl" className="mb-6">
        Settings
      </Heading>

      <Card className="p-6">
        <Tabs items={tabs} />
      </Card>
    </Container>
  );
};
