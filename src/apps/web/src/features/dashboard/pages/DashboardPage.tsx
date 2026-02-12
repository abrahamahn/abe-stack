// src/apps/web/src/features/dashboard/pages/DashboardPage.tsx
import { useNavigate, type NavigateFunction } from '@abe-stack/react/router';
import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';
import { FeatureHint, SectionErrorBoundary } from '@app/components';
import { useAuth } from '@auth';
import { GettingStartedChecklist } from '@dashboard';
import { ActivityFeed } from '@features/activities';
import type { JSX } from 'react';

export const DashboardPage = (): JSX.Element => {
  const { user, logout } = useAuth();
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

      <SectionErrorBoundary>
        <Card>
          <Heading as="h2" size="md" className="mb-2">
            Your Profile
          </Heading>
          <div className="grid gap-2">
            <Text>
              <strong>Email:</strong> {user?.email}
            </Text>
            <Text>
              <strong>Name:</strong>{' '}
              {user !== null && (user.firstName.length > 0 || user.lastName.length > 0)
                ? `${user.firstName} ${user.lastName}`.trim()
                : 'Not provided'}
            </Text>
            <Text>
              <strong>User ID:</strong> {user?.id}
            </Text>
          </div>
        </Card>
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <FeatureHint
          featureKey="getting-started"
          title="Getting Started"
          description="Complete these steps to get the most out of your account"
        >
          <GettingStartedChecklist />
        </FeatureHint>
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <Card>
          <Heading as="h3" size="sm" className="mb-3">
            Recent Activity
          </Heading>
          <ActivityFeed limit={10} />
        </Card>
      </SectionErrorBoundary>
    </PageContainer>
  );
};
