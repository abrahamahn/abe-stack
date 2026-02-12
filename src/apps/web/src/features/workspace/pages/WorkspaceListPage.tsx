// src/apps/web/src/features/workspace/pages/WorkspaceListPage.tsx
/**
 * Workspace List Page
 *
 * Displays all workspaces the user belongs to with a create button.
 */

import { toastStore } from '@abe-stack/react';
import { Button, Heading, Text, useNavigate } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { CreateWorkspaceDialog, WorkspaceList } from '../components';
import { useWorkspaces } from '../hooks';

import type { Tenant } from '@abe-stack/shared';

// ============================================================================
// Component
// ============================================================================

export const WorkspaceListPage = (): ReactElement => {
  const { data: workspaces, isLoading } = useWorkspaces();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (workspace: Tenant): void => {
    navigate(`/workspaces/${workspace.id}`);
  };

  const handleCreateSuccess = (tenantId: string): void => {
    const isFirstWorkspace = workspaces.length === 0;
    if (isFirstWorkspace) {
      toastStore.getState().show({
        title: 'Your first workspace!',
        description: 'You\'re all set to start collaborating with your team.',
        tone: 'success',
      });
      navigate(`/workspaces/${tenantId}?welcome=1`);
    } else {
      navigate(`/workspaces/${tenantId}`);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading as="h2" size="lg">
            Workspaces
          </Heading>
          <Text tone="muted" size="sm">
            Manage your workspaces and team collaboration.
          </Text>
        </div>
        <Button
          type="button"
          onClick={() => {
            setShowCreate(true);
          }}
        >
          Create Workspace
        </Button>
      </div>

      <WorkspaceList workspaces={workspaces} isLoading={isLoading} onSelect={handleSelect} />

      <CreateWorkspaceDialog
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
        }}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};
