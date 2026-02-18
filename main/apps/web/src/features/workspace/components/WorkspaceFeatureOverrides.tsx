// main/apps/web/src/features/workspace/components/WorkspaceFeatureOverrides.tsx
/**
 * Workspace Feature Overrides
 *
 * Component for managing tenant-specific feature flag overrides.
 * Shows global feature flags and allows workspace admins to override
 * flag states for this specific workspace.
 */

import {
  Alert,
  Badge,
  Button,
  Card,
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';
import { useState, type ReactElement } from 'react';

import {
  useSetFeatureOverride,
  useWorkspaceFeatureOverrides,
} from '../hooks/useWorkspaceFeatureOverrides';

import type { FlagWithOverride } from '../hooks/useWorkspaceFeatureOverrides';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceFeatureOverridesProps {
  tenantId: string;
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceFeatureOverrides = ({
  tenantId,
}: WorkspaceFeatureOverridesProps): ReactElement => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { flags, isLoading, error, refetch } = useWorkspaceFeatureOverrides(tenantId);
  const {
    setOverride,
    isLoading: isSaving,
    error: saveError,
  } = useSetFeatureOverride({
    onSuccess: () => {
      setSuccessMessage('Feature override updated successfully');
      void refetch();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
  });

  const handleToggle = (flag: FlagWithOverride, newState: 'inherit' | 'on' | 'off'): void => {
    setSuccessMessage(null);
    setOverride(tenantId, flag.key, newState);
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Body>
          <Heading as="h3" size="md" className="mb-4">
            Feature Overrides
          </Heading>
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body>
        <div className="mb-4">
          <Heading as="h3" size="md" className="mb-2">
            Feature Overrides
          </Heading>
          <Text tone="muted" size="sm">
            Override feature flags for this workspace. &quot;Inherit&quot; uses the global setting,
            &quot;On&quot; forces enabled, and &quot;Off&quot; forces disabled.
          </Text>
        </div>

        {error !== null && (
          <Alert tone="danger" className="mb-4">
            {error.message}
          </Alert>
        )}
        {saveError !== null && (
          <Alert tone="danger" className="mb-4">
            {saveError.message}
          </Alert>
        )}
        {successMessage !== null && (
          <Alert tone="success" className="mb-4">
            {successMessage}
          </Alert>
        )}

        {flags.length === 0 ? (
          <Text tone="muted">No feature flags defined yet.</Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Global State</TableHead>
                <TableHead>Override</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => {
                const isInherit = flag.overrideState === 'inherit';
                const isOn = flag.overrideState === 'on';
                const isOff = flag.overrideState === 'off';

                return (
                  <TableRow key={flag.key}>
                    <TableCell>
                      <div>
                        <Text size="sm" style={{ fontWeight: 'var(--ui-font-weight-medium)' }}>
                          {flag.key}
                        </Text>
                        {flag.description !== null && (
                          <Text size="sm" tone="muted">
                            {flag.description}
                          </Text>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge tone={flag.globalEnabled ? 'success' : 'danger'}>
                        {flag.globalEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={isInherit ? 'info' : isOn ? 'success' : 'danger'}>
                        {isInherit ? 'Inherit' : isOn ? 'On' : 'Off'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          variant={isInherit ? 'primary' : 'secondary'}
                          disabled={isSaving || isInherit}
                          onClick={() => {
                            handleToggle(flag, 'inherit');
                          }}
                        >
                          Inherit
                        </Button>
                        <Button
                          size="small"
                          variant={isOn ? 'primary' : 'secondary'}
                          disabled={isSaving || isOn}
                          onClick={() => {
                            handleToggle(flag, 'on');
                          }}
                        >
                          On
                        </Button>
                        <Button
                          size="small"
                          variant={isOff ? 'primary' : 'secondary'}
                          disabled={isSaving || isOff}
                          onClick={() => {
                            handleToggle(flag, 'off');
                          }}
                        >
                          Off
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};
