import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';
import { useAuth, type User } from '@auth';
import { useNavigate, type NavigateFunction } from 'react-router-dom';

import type { JSX } from 'react';

export function DashboardPage(): JSX.Element {
  const { user, logout }: { user: User | null; logout: () => Promise<void> } = useAuth();
  const navigate: NavigateFunction = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    void navigate('/');
  };

  return (
    <PageContainer>
      <section className="flex-between">
        <Heading as="h1" size="xl">
          Dashboard
        </Heading>
        <Button
          onClick={() => {
            void handleLogout();
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
            <strong>Name:</strong> {user?.name || 'Not provided'}
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
    </PageContainer>
  );
}
