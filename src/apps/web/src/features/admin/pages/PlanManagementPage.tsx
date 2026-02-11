// src/apps/web/src/features/admin/pages/PlanManagementPage.tsx
/**
 * PlanManagementPage - Admin page for managing billing plans.
 *
 * Features:
 * - List all plans (active and inactive)
 * - Create new plans
 * - Edit existing plans
 * - Activate/deactivate plans
 * - Sync with Stripe
 */

import { useAdminPlans, type AdminBillingClientConfig } from '@abe-stack/client-engine';
import { tokenStore } from '@abe-stack/shared';
import {
  Badge,
  Button,
  Card,
  Dialog,
  Heading,
  Input,
  PageContainer,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@abe-stack/ui';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useState, useCallback } from 'react';

import type {
  AdminPlan,
  CreatePlanRequest,
  FeatureKey,
  PlanFeature,
  UpdatePlanRequest,
} from '@abe-stack/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Local Types (for form state)
// ============================================================================

/**
 * Simplified feature shape for form state.
 * Mapped to the domain PlanFeature union at API call boundaries.
 */
interface PlanFeatureLocal {
  key: FeatureKey;
  name: string;
  included: boolean;
}

/** Limit feature keys that require a numeric value */
const LIMIT_KEYS: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  'projects:limit',
  'storage:limit',
  'media:max_file_size',
]);

/**
 * Type guard: checks whether a FeatureKey is a limit feature key.
 *
 * @param key - Feature key to check
 * @returns True if the key is a limit feature key
 */
function isLimitKey(
  key: FeatureKey,
): key is 'projects:limit' | 'storage:limit' | 'media:max_file_size' {
  return LIMIT_KEYS.has(key);
}

/**
 * Maps local form features to domain PlanFeature union.
 *
 * Limit features receive a default value of 0 since the local form
 * state does not track numeric limits; the actual value is set
 * separately in the plan editor.
 *
 * @param features - Local feature form data
 * @returns Domain-typed PlanFeature array
 * @complexity O(n) where n is feature count
 */
function toApiFeatures(features: readonly PlanFeatureLocal[]): PlanFeature[] {
  return features.map((f): PlanFeature => {
    const { key, name, included } = f;
    if (isLimitKey(key)) {
      return { key, name, included, value: 0 };
    }
    return { key, name, included };
  });
}

/**
 * Maps domain PlanFeature union to local form features.
 *
 * @param features - Domain PlanFeature array
 * @returns Local feature form data
 * @complexity O(n) where n is feature count
 */
function fromApiFeatures(features: readonly PlanFeature[]): PlanFeatureLocal[] {
  return features.map(
    (f): PlanFeatureLocal => ({
      key: f.key,
      name: f.name,
      included: f.included,
    }),
  );
}

// ============================================================================
// Types
// ============================================================================

interface PlanFormData {
  name: string;
  description: string;
  interval: 'month' | 'year';
  priceInCents: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  sortOrder: number;
  features: PlanFeatureLocal[];
}

const defaultFormData: PlanFormData = {
  name: '',
  description: '',
  interval: 'month',
  priceInCents: 0,
  currency: 'usd',
  trialDays: 0,
  isActive: true,
  sortOrder: 0,
  features: [],
};

// ============================================================================
// Helper Components
// ============================================================================

interface PlanFormProps {
  data: PlanFormData;
  onChange: (data: PlanFormData) => void;
  isSubmitting?: boolean;
}

const PlanForm = ({ data, onChange, isSubmitting }: PlanFormProps): ReactElement => {
  const handleChange = <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]): void => {
    onChange({ ...data, [key]: value });
  };

  const handleAddFeature = (): void => {
    onChange({
      ...data,
      features: [...data.features, { key: 'team:invite' as FeatureKey, name: '', included: true }],
    });
  };

  const handleRemoveFeature = (index: number): void => {
    const newFeatures = [...data.features];
    newFeatures.splice(index, 1);
    onChange({ ...data, features: newFeatures });
  };

  const handleFeatureChange = (
    index: number,
    field: keyof PlanFeatureLocal,
    value: string | boolean,
  ): void => {
    const newFeatures = [...data.features];
    const currentFeature = newFeatures[index];
    if (currentFeature !== undefined) {
      newFeatures[index] = { ...currentFeature, [field]: value };
      onChange({ ...data, features: newFeatures });
    }
  };

  return (
    <div className="plan-form">
      <div className="plan-form__field">
        <label htmlFor="name">Plan Name *</label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => {
            handleChange('name', e.target.value);
          }}
          placeholder="e.g., Pro Plan"
          disabled={isSubmitting}
        />
      </div>

      <div className="plan-form__field">
        <label htmlFor="description">Description</label>
        <Input
          id="description"
          value={data.description}
          onChange={(e) => {
            handleChange('description', e.target.value);
          }}
          placeholder="Brief description of the plan"
          disabled={isSubmitting}
        />
      </div>

      <div className="plan-form__row">
        <div className="plan-form__field">
          <label htmlFor="interval">Billing Interval *</label>
          <Select
            value={data.interval}
            onChange={(value) => {
              handleChange('interval', value as 'month' | 'year');
            }}
            disabled={isSubmitting}
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </Select>
        </div>

        <div className="plan-form__field">
          <label htmlFor="price">Price (cents) *</label>
          <Input
            id="price"
            type="number"
            value={data.priceInCents.toString()}
            onChange={(e) => {
              const parsedValue = parseInt(e.target.value, 10);
              handleChange('priceInCents', Number.isNaN(parsedValue) ? 0 : parsedValue);
            }}
            placeholder="e.g., 1999 for $19.99"
            disabled={isSubmitting}
          />
        </div>

        <div className="plan-form__field">
          <label htmlFor="currency">Currency</label>
          <Input
            id="currency"
            value={data.currency}
            onChange={(e) => {
              handleChange('currency', e.target.value.toLowerCase());
            }}
            placeholder="usd"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="plan-form__row">
        <div className="plan-form__field">
          <label htmlFor="trialDays">Trial Days</label>
          <Input
            id="trialDays"
            type="number"
            value={data.trialDays.toString()}
            onChange={(e) => {
              const parsedValue = parseInt(e.target.value, 10);
              handleChange('trialDays', Number.isNaN(parsedValue) ? 0 : parsedValue);
            }}
            placeholder="0"
            disabled={isSubmitting}
          />
        </div>

        <div className="plan-form__field">
          <label htmlFor="sortOrder">Sort Order</label>
          <Input
            id="sortOrder"
            type="number"
            value={data.sortOrder.toString()}
            onChange={(e) => {
              const parsedValue = parseInt(e.target.value, 10);
              handleChange('sortOrder', Number.isNaN(parsedValue) ? 0 : parsedValue);
            }}
            placeholder="0"
            disabled={isSubmitting}
          />
        </div>

        <div className="plan-form__field plan-form__field--switch">
          <label htmlFor="isActive">Active</label>
          <Switch
            id="isActive"
            checked={data.isActive}
            onChange={(checked) => {
              handleChange('isActive', checked);
            }}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="plan-form__features">
        <div className="plan-form__features-header">
          <label>Features</label>
          <Button
            type="button"
            size="small"
            variant="text"
            onClick={handleAddFeature}
            disabled={isSubmitting}
          >
            + Add Feature
          </Button>
        </div>
        {data.features.map((feature, index) => (
          <div key={index} className="plan-form__feature-row">
            <Select
              value={feature.key}
              onChange={(value) => {
                handleFeatureChange(index, 'key', value);
              }}
              disabled={isSubmitting}
            >
              <option value="team:invite">Team Invite</option>
              <option value="api:access">API Access</option>
              <option value="branding:custom">Custom Branding</option>
              <option value="projects:limit">Projects Limit</option>
              <option value="storage:limit">Storage Limit</option>
            </Select>
            <Input
              value={feature.name}
              onChange={(e) => {
                handleFeatureChange(index, 'name', e.target.value);
              }}
              placeholder="Feature name"
              disabled={isSubmitting}
            />
            <Switch
              checked={feature.included}
              onChange={(checked) => {
                handleFeatureChange(index, 'included', checked);
              }}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              size="small"
              variant="text"
              onClick={() => {
                handleRemoveFeature(index);
              }}
              disabled={isSubmitting}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PlanManagementPage = (): ReactElement => {
  const { config } = useClientEnvironment();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<AdminPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);

  const clientConfig: AdminBillingClientConfig = {
    baseUrl: config.apiUrl,
    getToken: (): string | null => tokenStore.get(),
  };

  const { plans, isLoading, isActing, create, update, syncToStripe, deactivate, error } =
    useAdminPlans(clientConfig);

  // Handlers
  const handleOpenCreate = useCallback((): void => {
    setFormData(defaultFormData);
    setCreateDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((plan: AdminPlan): void => {
    setFormData({
      name: plan.name,
      description: plan.description ?? '',
      interval: plan.interval,
      priceInCents: plan.priceInCents,
      currency: plan.currency,
      trialDays: plan.trialDays,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      features: fromApiFeatures(plan.features),
    });
    setEditPlan(plan);
  }, []);

  const handleCreate = useCallback(async (): Promise<void> => {
    const request: CreatePlanRequest = {
      name: formData.name,
      ...(formData.description !== '' && { description: formData.description }),
      interval: formData.interval,
      priceInCents: formData.priceInCents,
      currency: formData.currency,
      trialDays: formData.trialDays,
      isActive: formData.isActive,
      sortOrder: formData.sortOrder,
      features: toApiFeatures(formData.features),
    };
    await create(request);
    setCreateDialogOpen(false);
  }, [formData, create]);

  const handleUpdate = useCallback(async (): Promise<void> => {
    if (editPlan === null) return;
    const request: UpdatePlanRequest = {
      name: formData.name,
      description: formData.description !== '' ? formData.description : null,
      interval: formData.interval,
      priceInCents: formData.priceInCents,
      currency: formData.currency,
      trialDays: formData.trialDays,
      isActive: formData.isActive,
      sortOrder: formData.sortOrder,
      features: toApiFeatures(formData.features),
    };
    await update(editPlan.id, request);
    setEditPlan(null);
  }, [editPlan, formData, update]);

  const handleSync = useCallback(
    async (planId: string): Promise<void> => {
      await syncToStripe(planId);
    },
    [syncToStripe],
  );

  const handleDeactivate = useCallback(
    async (planId: string): Promise<void> => {
      if (confirm('Are you sure you want to deactivate this plan?')) {
        await deactivate(planId);
      }
    },
    [deactivate],
  );

  const formatPrice = (cents: number, currency: string): string => {
    const price = cents / 100;
    const symbol = currency.toUpperCase() === 'USD' ? '$' : currency.toUpperCase();
    return `${symbol}${price.toFixed(2)}`;
  };

  return (
    <PageContainer className="plan-management-page">
      <div className="plan-management-page__header">
        <Heading as="h1" className="plan-management-page__title">
          Plan Management
        </Heading>
        <Button onClick={handleOpenCreate}>Create Plan</Button>
      </div>

      {error !== null && (
        <Card className="plan-management-page__error">
          <Card.Body>{error.message}</Card.Body>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <Card.Body>Loading plans...</Card.Body>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan: AdminPlan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <strong>{plan.name}</strong>
                    {plan.description !== null && plan.description !== '' && (
                      <Text as="span" className="text-muted block text-sm">
                        {plan.description}
                      </Text>
                    )}
                  </TableCell>
                  <TableCell>{formatPrice(plan.priceInCents, plan.currency)}</TableCell>
                  <TableCell>{plan.interval === 'month' ? 'Monthly' : 'Yearly'}</TableCell>
                  <TableCell>
                    {plan.trialDays > 0 ? `${String(plan.trialDays)} days` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge tone={plan.isActive ? 'success' : 'info'}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {plan.stripePriceId !== null && plan.stripePriceId !== '' ? (
                      <Badge tone="success">Synced</Badge>
                    ) : (
                      <Badge tone="warning">Not synced</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="plan-management-page__actions">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          handleOpenEdit(plan);
                        }}
                        disabled={isActing}
                      >
                        Edit
                      </Button>
                      {(plan.stripePriceId === null || plan.stripePriceId === '') && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            void handleSync(plan.id);
                          }}
                          disabled={isActing}
                        >
                          Sync to Stripe
                        </Button>
                      )}
                      {plan.isActive && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            void handleDeactivate(plan.id);
                          }}
                          disabled={isActing}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <Dialog.Root open={createDialogOpen} onChange={setCreateDialogOpen}>
        <Dialog.Content title="Create New Plan">
          <PlanForm data={formData} onChange={setFormData} isSubmitting={isActing} />
          <div className="dialog-actions">
            <Button
              variant="text"
              onClick={() => {
                setCreateDialogOpen(false);
              }}
              disabled={isActing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCreate();
              }}
              disabled={isActing || formData.name === '' || formData.priceInCents <= 0}
            >
              {isActing ? 'Creating...' : 'Create Plan'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Edit Plan Dialog */}
      <Dialog.Root
        open={editPlan !== null}
        onChange={(open) => {
          if (!open) setEditPlan(null);
        }}
      >
        <Dialog.Content title={`Edit Plan: ${editPlan?.name ?? ''}`}>
          <PlanForm data={formData} onChange={setFormData} isSubmitting={isActing} />
          <div className="dialog-actions">
            <Button
              variant="text"
              onClick={() => {
                setEditPlan(null);
              }}
              disabled={isActing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleUpdate();
              }}
              disabled={isActing || formData.name === ''}
            >
              {isActing ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </PageContainer>
  );
};
