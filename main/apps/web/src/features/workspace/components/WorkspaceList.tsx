// main/apps/web/src/features/workspace/components/WorkspaceList.tsx
/**
 * Workspace List Component
 *
 * Displays a grid of workspace cards with basic info.
 */

import { Badge, Card, Heading, Skeleton, Text } from '@bslt/ui';

import type { Tenant } from '@bslt/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceListProps {
  workspaces: Tenant[];
  isLoading: boolean;
  onSelect: (workspace: Tenant) => void;
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceList = ({
  workspaces,
  isLoading,
  onSelect,
}: WorkspaceListProps): ReactElement => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Text tone="muted">No workspaces yet. Create your first workspace to get started.</Text>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {workspaces.map((workspace) => (
        <Card
          key={workspace.id}
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            onSelect(workspace);
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <Heading as="h4" size="sm">
              {workspace.name}
            </Heading>
            {!workspace.isActive && <Badge tone="warning">Inactive</Badge>}
          </div>
          <Text size="sm" tone="muted" className="mb-2">
            {workspace.slug}
          </Text>
          <Text size="xs" tone="muted">
            Created {new Date(workspace.createdAt).toLocaleDateString()}
          </Text>
        </Card>
      ))}
    </div>
  );
};
