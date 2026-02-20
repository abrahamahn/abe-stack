// main/apps/web/src/features/admin/components/FeatureFlagOverrideTable.tsx
/**
 * FeatureFlagOverrideTable Component
 *
 * Table showing tenant-specific feature flag overrides for a given flag.
 * Supports adding, toggling, and removing overrides.
 */

import { formatDateTime } from '@bslt/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  Heading,
  Input,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';
import { useCallback, useState } from 'react';

import {
  useDeleteFeatureFlagOverride,
  useFeatureFlagOverrides,
  useSetFeatureFlagOverride,
} from '../hooks/useFeatureFlagOverrides';

import type { FeatureFlagOverrideLocal } from '../services/adminApi';
import type { ChangeEvent, ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FeatureFlagOverrideTableProps {
  flagKey: string;
}

// ============================================================================
// Component
// ============================================================================

export function FeatureFlagOverrideTable({ flagKey }: FeatureFlagOverrideTableProps): ReactElement {
  const { data, isLoading, isError, error, refetch } = useFeatureFlagOverrides({
    flagKey,
  });

  const [showAdd, setShowAdd] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');
  const [newEnabled, setNewEnabled] = useState(true);

  const setOverride = useSetFeatureFlagOverride({
    onSuccess: () => {
      setNewTenantId('');
      setNewEnabled(true);
      setShowAdd(false);
      void refetch();
    },
  });

  const deleteOverride = useDeleteFeatureFlagOverride({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleAdd = useCallback(() => {
    if (newTenantId.trim() === '') return;
    setOverride.setOverride({
      flagKey,
      request: {
        tenantId: newTenantId.trim(),
        isEnabled: newEnabled,
      },
    });
  }, [flagKey, newTenantId, newEnabled, setOverride]);

  const handleToggle = useCallback(
    (tenantId: string, currentEnabled: boolean) => {
      setOverride.setOverride({
        flagKey,
        request: {
          tenantId,
          isEnabled: !currentEnabled,
        },
      });
    },
    [flagKey, setOverride],
  );

  const handleDelete = useCallback(
    (tenantId: string) => {
      deleteOverride.deleteOverride({ flagKey, tenantId });
    },
    [flagKey, deleteOverride],
  );

  const overrides = data?.overrides ?? [];

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <Heading as="h3" size="sm">
            Tenant Overrides for <span className="font-mono text-primary">{flagKey}</span>
          </Heading>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              setShowAdd(!showAdd);
            }}
          >
            {showAdd ? 'Cancel' : 'Add Override'}
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Add Override Form */}
        {showAdd && (
          <div className="mb-4 p-3 bg-surface rounded border border-border">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Text as="label" size="sm" tone="muted">
                  Tenant ID
                </Text>
                <Input
                  placeholder="Enter tenant ID"
                  value={newTenantId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setNewTenantId(e.target.value);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Text size="sm" tone="muted">
                  Enabled
                </Text>
                <Switch
                  checked={newEnabled}
                  onChange={(checked: boolean) => {
                    setNewEnabled(checked);
                  }}
                />
              </div>
              <Button
                variant="primary"
                size="small"
                onClick={handleAdd}
                disabled={setOverride.isLoading || newTenantId.trim() === ''}
              >
                {setOverride.isLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {setOverride.isError && (
              <Alert tone="danger" className="mt-2">
                {setOverride.error?.message ?? 'Failed to set override'}
              </Alert>
            )}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert tone="danger" className="mb-4">
            {error?.message ?? 'Failed to load overrides'}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton width="100%" height="2.5rem" />
            <Skeleton width="100%" height="2.5rem" />
          </div>
        ) : overrides.length === 0 ? (
          <Text tone="muted" size="sm">
            No tenant-specific overrides. All tenants use the global default.
          </Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant ID</TableHead>
                <TableHead>Tenant Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((override: FeatureFlagOverrideLocal) => (
                <TableRow key={`${override.flagKey}-${override.tenantId}`}>
                  <TableCell>
                    <Text size="sm" className="font-mono">
                      {override.tenantId}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{override.tenantName ?? '-'}</Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={override.isEnabled}
                        onChange={(_checked: boolean) => {
                          handleToggle(override.tenantId, override.isEnabled);
                        }}
                        disabled={setOverride.isLoading}
                      />
                      <Badge tone={override.isEnabled ? 'success' : 'warning'}>
                        {override.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{formatDateTime(override.updatedAt)}</Text>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      size="small"
                      className="text-danger"
                      onClick={() => {
                        handleDelete(override.tenantId);
                      }}
                      disabled={deleteOverride.isLoading}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
