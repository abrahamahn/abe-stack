// main/apps/web/src/features/workspace/components/TenantSwitcher.tsx
/**
 * Tenant Switcher Component
 *
 * Dropdown in the header for switching between workspaces.
 */

import { Button, Dropdown, Text } from '@bslt/ui';

import { useWorkspaceContext, useWorkspaces } from '../hooks';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface TenantSwitcherProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const TenantSwitcher = ({ className }: TenantSwitcherProps): ReactElement | null => {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { currentWorkspaceId, setCurrentWorkspace } = useWorkspaceContext();

  if (isLoading || workspaces.length === 0) return null;

  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
  const displayName = current !== undefined ? current.name : 'Select Workspace';

  return (
    <div className={className}>
      <Dropdown
        trigger={
          <Button variant="secondary" size="small">
            <Text size="sm">{displayName}</Text>
          </Button>
        }
      >
        <div className="flex flex-col">
          {workspaces.map((workspace) => (
            <Button
              key={workspace.id}
              type="button"
              variant="text"
              className="menu-item text-left"
              onClick={(): void => {
                setCurrentWorkspace(workspace.id);
              }}
            >
              {workspace.name}
            </Button>
          ))}
        </div>
      </Dropdown>
    </div>
  );
};
