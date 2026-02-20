// main/apps/web/src/features/admin/components/PlanOverrideSelector.tsx
/**
 * PlanOverrideSelector Component
 *
 * Allows admin to assign a specific plan to a tenant.
 * Fetches available plans and lets admin select one to override.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useAdminPlans } from '@bslt/react';
import { Alert, Badge, Button, Card, Heading, Select, Text } from '@bslt/ui';
import { useCallback, useState } from 'react';

import { useTenantPlanAssignment } from '../hooks/useTenantPlanAssignment';

import type { AdminBillingClientConfig } from '@bslt/api';
import type { AdminPlan } from '@bslt/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PlanOverrideSelectorProps {
  tenantId: string;
  currentSubscriptionId: string | null;
  onPlanAssigned?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PlanOverrideSelector({
  tenantId,
  currentSubscriptionId,
  onPlanAssigned,
}: PlanOverrideSelectorProps): ReactElement {
  const { config } = useClientEnvironment();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clientConfig: AdminBillingClientConfig = {
    baseUrl: config.apiUrl,
    getToken: getAccessToken,
  };

  const { plans, isLoading: plansLoading } = useAdminPlans(clientConfig);

  const {
    assignPlan,
    isLoading: isAssigning,
    isError,
    error,
  } = useTenantPlanAssignment({
    onSuccess: (response) => {
      setSuccessMessage(response.message);
      setSelectedPlanId('');
      onPlanAssigned?.();
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
  });

  const activePlans = plans.filter((plan: AdminPlan) => plan.isActive);

  const handleAssign = useCallback(() => {
    if (selectedPlanId === '' || tenantId === '') return;
    assignPlan({ tenantId, planId: selectedPlanId });
  }, [selectedPlanId, tenantId, assignPlan]);

  return (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Plan Override
        </Heading>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div>
            <Text size="sm" tone="muted">
              Current Subscription
            </Text>
            <div className="mt-1">
              {currentSubscriptionId !== null ? (
                <Badge tone="info">{currentSubscriptionId}</Badge>
              ) : (
                <Badge tone="warning">No subscription</Badge>
              )}
            </div>
          </div>

          <div>
            <Text size="sm" tone="muted">
              Assign a specific plan to this tenant. This overrides any self-service subscription.
            </Text>
          </div>

          {plansLoading ? (
            <Text size="sm" tone="muted">
              Loading plans...
            </Text>
          ) : (
            <div className="space-y-3">
              <Select
                value={selectedPlanId}
                onChange={(value: string) => {
                  setSelectedPlanId(value);
                }}
                disabled={isAssigning}
              >
                <option value="">Select a plan...</option>
                {activePlans.map((plan: AdminPlan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.interval === 'month' ? 'Monthly' : 'Yearly'} - $
                    {(plan.priceInCents / 100).toFixed(2)})
                  </option>
                ))}
              </Select>

              <Button
                variant="primary"
                size="small"
                onClick={handleAssign}
                disabled={isAssigning || selectedPlanId === ''}
              >
                {isAssigning ? 'Assigning...' : 'Assign Plan'}
              </Button>
            </div>
          )}

          {isError && <Alert tone="danger">{error?.message ?? 'Failed to assign plan'}</Alert>}

          {successMessage !== null && <Alert tone="success">{successMessage}</Alert>}
        </div>
      </Card.Body>
    </Card>
  );
}
