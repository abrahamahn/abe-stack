// main/apps/web/src/features/dashboard/pages/DashboardPage.tsx
import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { FeatureHint, SectionErrorBoundary } from '@app/components';
import { useAuth } from '@auth';
import { useSubscription } from '@bslt/react';
import { Link, useNavigate, type NavigateFunction } from '@bslt/react/router';
import { Badge, Button, Card, Heading, PageContainer, Skeleton, Text } from '@bslt/ui';
import { GettingStartedChecklist } from '@dashboard';
import { ActivityFeed } from '@features/activities';
import { useMemo } from 'react';

import type { BillingClientConfig } from '@bslt/api';
import type { JSX } from 'react';

export const DashboardPage = (): JSX.Element => {
  const { user, isLoading, logout } = useAuth();
  const navigate: NavigateFunction = useNavigate();
  const { config } = useClientEnvironment();
  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  const hasName = firstName.length > 0 || lastName.length > 0;
  const displayName = `${firstName} ${lastName}`.trim();

  const clientConfig: BillingClientConfig = useMemo(
    () => ({
      baseUrl: config.apiUrl,
      getToken: getAccessToken,
    }),
    [config.apiUrl],
  );

  const { subscription, isLoading: subLoading } = useSubscription(clientConfig);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/');
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4">
          <Skeleton width="10rem" height="2rem" />
          <Skeleton width="100%" height="6rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="8rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="10rem" radius="var(--ui-radius-md)" />
        </div>
      </PageContainer>
    );
  }

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
              <strong>Name:</strong> {hasName ? displayName : 'Not provided'}
            </Text>
            <Text>
              <strong>User ID:</strong> {user?.id}
            </Text>
          </div>
        </Card>
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        {subLoading ? (
          <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
        ) : (
          <Card>
            <div className="flex-between">
              <div className="flex flex-col gap-1">
                <Heading as="h2" size="sm">
                  Current Plan
                </Heading>
                {subscription !== null ? (
                  <Text>
                    You&apos;re on the <Badge tone="info">{subscription.plan.name}</Badge>
                  </Text>
                ) : (
                  <Text>No active subscription.</Text>
                )}
              </div>
              <Link to="/billing">
                <Button variant="text">
                  {subscription !== null ? 'Manage billing' : 'Upgrade to unlock more features'}
                </Button>
              </Link>
            </div>
          </Card>
        )}
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
