// main/apps/web/src/features/admin/pages/FeatureFlagsPage.tsx
/**
 * FeatureFlagsPage
 *
 * Admin page for managing global feature flags.
 * Supports listing, creating, toggling, and deleting flags.
 */

import { formatDate } from '@bslt/shared';
import {
  Alert,
  Badge,
  Button,
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

import { FeatureFlagOverrideTable } from '../components/FeatureFlagOverrideTable';
import {
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
} from '../hooks/useFeatureFlags';

import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export function FeatureFlagsPage(): ReactElement {
  const { data, isLoading, isError, error, refetch } = useFeatureFlags();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedOverrideKey, setSelectedOverrideKey] = useState<string | null>(null);

  const createFlag = useCreateFeatureFlag({
    onSuccess: () => {
      setNewKey('');
      setNewDescription('');
      setShowCreate(false);
      void refetch();
    },
  });

  const updateFlag = useUpdateFeatureFlag({
    onSuccess: () => {
      void refetch();
    },
  });

  const deleteFlag = useDeleteFeatureFlag({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleCreate = useCallback(() => {
    if (newKey.trim() === '') return;
    const data: { key: string; description?: string; isEnabled: boolean } = {
      key: newKey.trim(),
      isEnabled: false,
    };
    if (newDescription.trim() !== '') {
      data.description = newDescription.trim();
    }
    createFlag.createFlag(data);
  }, [newKey, newDescription, createFlag]);

  const handleToggle = useCallback(
    (key: string, currentEnabled: boolean) => {
      updateFlag.updateFlag({ key, update: { isEnabled: !currentEnabled } });
    },
    [updateFlag],
  );

  const handleDelete = useCallback(
    (key: string) => {
      deleteFlag.deleteFlag(key);
    },
    [deleteFlag],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <Skeleton width="12rem" height="1.75rem" />
        <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
        <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
        <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
      </div>
    );
  }

  if (isError) {
    return <Alert tone="danger">{error?.message ?? 'Failed to load feature flags'}</Alert>;
  }

  const flags = data?.flags ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading as="h2">Feature Flags</Heading>
          <Text tone="muted" size="sm">
            Manage global feature flags for your application.
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => {
            setShowCreate(!showCreate);
          }}
        >
          {showCreate ? 'Cancel' : 'Create Flag'}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-surface rounded border border-border">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Text as="label" size="sm" tone="muted">
                Key
              </Text>
              <Input
                placeholder="e.g. billing.seat_based"
                value={newKey}
                onChange={(e: { target: { value: string } }) => {
                  setNewKey(e.target.value);
                }}
              />
              <Text size="sm" tone="muted">
                Lowercase alphanumeric with dots and underscores. Example: billing.new_feature
              </Text>
            </div>
            <div className="flex flex-col gap-1">
              <Text as="label" size="sm" tone="muted">
                Description
              </Text>
              <Input
                placeholder="What does this flag control?"
                value={newDescription}
                onChange={(e: { target: { value: string } }) => {
                  setNewDescription(e.target.value);
                }}
              />
            </div>
          </div>
          {createFlag.isError && (
            <Alert tone="danger" className="mt-2">
              {createFlag.error?.message ?? 'Failed to create flag'}
            </Alert>
          )}
          <Button
            type="button"
            variant="primary"
            size="small"
            className="mt-3"
            onClick={handleCreate}
            disabled={createFlag.isLoading || newKey.trim() === ''}
          >
            {createFlag.isLoading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      )}

      {flags.length === 0 ? (
        <Text tone="muted">No feature flags defined. Create one to get started.</Text>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((flag) => (
              <TableRow key={flag.key}>
                <TableCell>
                  <Text size="sm" className="font-mono">
                    {flag.key}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" tone="muted">
                    {flag.description ?? '-'}
                  </Text>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={flag.isEnabled}
                      onChange={() => {
                        handleToggle(flag.key, flag.isEnabled);
                      }}
                      disabled={updateFlag.isLoading}
                    />
                    <Badge tone={flag.isEnabled ? 'success' : 'warning'}>
                      {flag.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Text size="sm">{formatDate(flag.createdAt)}</Text>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={() => {
                        setSelectedOverrideKey(selectedOverrideKey === flag.key ? null : flag.key);
                      }}
                    >
                      {selectedOverrideKey === flag.key ? 'Hide Overrides' : 'Overrides'}
                    </Button>
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      className="text-danger"
                      onClick={() => {
                        handleDelete(flag.key);
                      }}
                      disabled={deleteFlag.isLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Per-Tenant Override Table */}
      {selectedOverrideKey !== null && (
        <div className="mt-6">
          <FeatureFlagOverrideTable flagKey={selectedOverrideKey} />
        </div>
      )}
    </div>
  );
}
