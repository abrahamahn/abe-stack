// src/apps/web/src/features/admin/pages/TenantDetailPage.tsx
/**
 * TenantDetailPage Component
 *
 * Admin page for viewing and managing a single tenant/workspace.
 */

import {
  Alert,
  Badge,
  Button,
  Card,
  Heading,
  Input,
  PageContainer,
  Skeleton,
  Text,
  useNavigate,
  useParams,
} from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import { useTenant } from '../hooks';

import type { JSX } from 'react';

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export const TenantDetailPage = (): JSX.Element => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant, isLoading, error, refresh, suspendTenant, unsuspendTenant, isSuspending } =
    useTenant(id ?? null);

  const [suspendReason, setSuspendReason] = useState('');

  const handleBack = useCallback(() => {
    navigate('/admin/tenants');
  }, [navigate]);

  const handleSuspend = useCallback(async () => {
    if (suspendReason.trim() === '') return;
    await suspendTenant(suspendReason.trim());
    setSuspendReason('');
  }, [suspendReason, suspendTenant]);

  const handleUnsuspend = useCallback(async () => {
    await unsuspendTenant();
  }, [unsuspendTenant]);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={handleBack}>
            Back to Tenants
          </Button>
          <div className="flex-1">
            <Heading as="h1" size="xl">
              {tenant !== null ? tenant.name : 'Tenant Details'}
            </Heading>
          </div>
          <Button
            onClick={() => {
              void refresh();
            }}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error !== null && error.length > 0 && <Alert tone="danger">{error}</Alert>}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {/* Main Content */}
        {!isLoading && tenant !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tenant Info Card */}
            <Card>
              <Card.Header>
                <Heading as="h2" size="md">
                  Tenant Information
                </Heading>
              </Card.Header>
              <Card.Body>
                <div className="space-y-4">
                  <div>
                    <Text size="sm" tone="muted">
                      ID
                    </Text>
                    <Text size="sm">{tenant.id}</Text>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Name
                    </Text>
                    <Text size="sm">{tenant.name}</Text>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Slug
                    </Text>
                    <Text size="sm">{tenant.slug}</Text>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Owner ID
                    </Text>
                    <Text size="sm">{tenant.ownerId}</Text>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Members
                    </Text>
                    <Text size="sm">{tenant.memberCount}</Text>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Status
                    </Text>
                    <Badge tone={tenant.isActive ? 'success' : 'danger'}>
                      {tenant.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Allowed Email Domains
                    </Text>
                    <Text size="sm">
                      {tenant.allowedEmailDomains.length > 0
                        ? tenant.allowedEmailDomains.join(', ')
                        : 'None'}
                    </Text>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Created
                    </Text>
                    <Text size="sm">{formatDateTime(tenant.createdAt)}</Text>
                  </div>
                  <div>
                    <Text size="sm" tone="muted">
                      Updated
                    </Text>
                    <Text size="sm">{formatDateTime(tenant.updatedAt)}</Text>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Actions Card */}
            <div className="space-y-6">
              <Card>
                <Card.Header>
                  <Heading as="h2" size="md">
                    Actions
                  </Heading>
                </Card.Header>
                <Card.Body>
                  <div className="space-y-4">
                    {tenant.isActive ? (
                      <div className="space-y-3">
                        <Text size="sm" tone="muted">
                          Suspend this tenant to disable access for all members.
                        </Text>
                        <Input.Field
                          label="Reason for suspension"
                          type="text"
                          value={suspendReason}
                          onChange={(e) => {
                            setSuspendReason(e.target.value);
                          }}
                          placeholder="Enter suspension reason"
                        />
                        <Button
                          variant="primary"
                          onClick={() => {
                            void handleSuspend();
                          }}
                          disabled={isSuspending || suspendReason.trim() === ''}
                          className="btn-danger-override"
                          style={{ backgroundColor: 'var(--ui-color-danger)' }}
                        >
                          {isSuspending ? 'Suspending...' : 'Suspend Tenant'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Alert tone="warning">This tenant is currently suspended.</Alert>
                        <Button
                          variant="primary"
                          onClick={() => {
                            void handleUnsuspend();
                          }}
                          disabled={isSuspending}
                        >
                          {isSuspending ? 'Unsuspending...' : 'Unsuspend Tenant'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>

              {/* Metadata Card */}
              {Object.keys(tenant.metadata).length > 0 && (
                <Card>
                  <Card.Header>
                    <Heading as="h2" size="md">
                      Metadata
                    </Heading>
                  </Card.Header>
                  <Card.Body>
                    <pre
                      className="text-sm overflow-auto rounded-md p-3"
                      style={{
                        backgroundColor: 'var(--ui-color-surface)',
                        color: 'var(--ui-color-text)',
                      }}
                    >
                      {JSON.stringify(tenant.metadata, null, 2)}
                    </pre>
                  </Card.Body>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
