// src/apps/web/src/features/workspace/components/WorkspaceDangerZone.tsx
/**
 * Workspace Danger Zone
 *
 * Two-step confirmation + sudo modal for workspace deletion.
 * Follows the same pattern as DataControlsSection's delete flow.
 */

import { Alert, Button, Card, Heading, Text } from '@abe-stack/ui';
import { useCallback, useState, type ReactElement } from 'react';

import { SudoModal } from '../../settings/components/SudoModal';
import { useDeleteWorkspace } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceDangerZoneProps {
  workspaceId: string;
  workspaceName: string;
  onDeleted?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceDangerZone = ({
  workspaceId,
  workspaceName,
  onDeleted,
}: WorkspaceDangerZoneProps): ReactElement => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sudoOpen, setSudoOpen] = useState(false);

  const { remove, isLoading, error } = useDeleteWorkspace({
    onSuccess: () => {
      onDeleted?.();
    },
  });

  const handleDeleteClick = useCallback((): void => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setSudoOpen(true);
  }, [showConfirm]);

  const handleSudoSuccess = useCallback(
    (_sudoToken: string): void => {
      setSudoOpen(false);
      setShowConfirm(false);
      remove(workspaceId);
    },
    [remove, workspaceId],
  );

  const handleSudoDismiss = useCallback((): void => {
    setSudoOpen(false);
    setShowConfirm(false);
  }, []);

  return (
    <>
      <Card className="p-4 border-danger">
        <Heading as="h4" size="sm" className="text-danger mb-2">
          Delete Workspace
        </Heading>
        <Text size="sm" tone="muted" className="mb-3">
          Permanently delete <strong>{workspaceName}</strong> and all its data. This action cannot be
          undone.
        </Text>

        {showConfirm && (
          <Alert tone="danger" className="mb-3" data-testid="delete-workspace-confirm">
            Are you sure? This will permanently delete the workspace and remove all members. Click
            the button again to confirm.
          </Alert>
        )}

        {error !== null && (
          <Alert tone="danger" className="mb-3">
            {error.message}
          </Alert>
        )}

        <Button
          type="button"
          variant="secondary"
          className="text-danger border-danger"
          onClick={handleDeleteClick}
          disabled={isLoading}
          data-testid="delete-workspace-button"
        >
          {isLoading
            ? 'Deleting...'
            : showConfirm
              ? 'Confirm Delete Workspace'
              : 'Delete Workspace'}
        </Button>
      </Card>

      <SudoModal open={sudoOpen} onSuccess={handleSudoSuccess} onDismiss={handleSudoDismiss} />
    </>
  );
};
