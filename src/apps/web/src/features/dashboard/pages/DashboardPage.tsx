// src/apps/web/src/features/dashboard/pages/DashboardPage.tsx
import { Button, Card, Heading, PageContainer, Text, useNavigate } from '@abe-stack/ui';
import { useAuth } from '@auth';
import { ActivityFeed } from '@features/activities';

import type { NavigateFunction } from '@abe-stack/ui';
import type { JSX } from 'react';

interface UserLocal {
  id?: string;
  email?: string;
  name?: string | null;
}

export const DashboardPage = (): JSX.Element => {
  const authResult = useAuth();
  const user = authResult.user as UserLocal | null;
  const logout = authResult.logout;
  const navigate: NavigateFunction = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/');
  };

  return (
    <PageContainer>
      <section className="flex-between">
        <Heading as="h1" size="xl">
          Dashboard
        </Heading>
        <Button
          onClick={() => {
            handleLogout().catch(() => {
              // Error is already handled by auth service
            });
          }}
        >
          Logout
        </Button>
      </section>

      <Card>
        <Heading as="h2" size="md" className="mb-2">
          Your Profile
        </Heading>
        <div className="grid gap-2">
          <Text>
            <strong>Email:</strong> {user?.email}
          </Text>
          <Text>
            <strong>Name:</strong> {user?.name ?? 'Not provided'}
          </Text>
          <Text>
            <strong>User ID:</strong> {user?.id}
          </Text>
        </div>
      </Card>

      <Card>
        <Heading as="h3" size="sm" className="mb-1">
          Welcome to your dashboard!
        </Heading>
        <Text tone="muted">
          This is a protected route that requires authentication. You can only access this page when
          logged in with a valid JWT token.
        </Text>
      </Card>

      <Card>
        <Heading as="h3" size="sm" className="mb-3">
          Recent Activity
        </Heading>
        <ActivityFeed limit={10} />
      </Card>
    </PageContainer>
  );
};
