// src/apps/web/src/features/workspace/pages/WorkspaceDetailPage.tsx
/**
 * Workspace Detail Page
 *
 * Displays workspace details with tabs for Settings, Members, and Invitations.
 */

import { Button, Card, Heading, Skeleton, Tabs, Text, useNavigate, useParams } from '@abe-stack/ui';
import { useAuth } from '@features/auth';
import { useMemo, useState, type ReactElement } from 'react';

import {
  InvitationsList,
  InviteMemberDialog,
  MembersList,
  WorkspaceSettingsForm,
} from '../components';
import { useDeleteWorkspace, useWorkspace } from '../hooks';

// ============================================================================
// Tab Components
// ============================================================================

const SettingsTab = ({ workspaceId }: { workspaceId: string }): ReactElement => {
  const { data: workspace } = useWorkspace(workspaceId);

  if (workspace === null) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <WorkspaceSettingsForm workspace={workspace} />
    </div>
  );
};

const MembersTab = ({
  workspaceId,
  currentUserId,
}: {
  workspaceId: string;
  currentUserId?: string;
}): ReactElement => {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="small"
          onClick={() => {
            setShowInvite(true);
          }}
        >
          Invite Member
        </Button>
      </div>
      <MembersList
        tenantId={workspaceId}
        {...(currentUserId !== undefined ? { currentUserId } : {})}
      />
      <InviteMemberDialog
        tenantId={workspaceId}
        open={showInvite}
        onClose={() => {
          setShowInvite(false);
        }}
      />
    </div>
  );
};

const InvitationsTab = ({ workspaceId }: { workspaceId: string }): ReactElement => {
  return <InvitationsList tenantId={workspaceId} />;
};

// ============================================================================
// Main Page
// ============================================================================

export const WorkspaceDetailPage = (): ReactElement => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const workspaceId = params['id'] ?? null;

  const { data: workspace, isLoading, isError, error } = useWorkspace(workspaceId);
  const { remove, isLoading: isDeleting } = useDeleteWorkspace({
    onSuccess: () => {
      navigate('/workspaces');
    },
  });

  const tabs = useMemo(
    () => [
      {
        id: 'settings',
        label: 'Settings',
        content: workspaceId !== null ? <SettingsTab workspaceId={workspaceId} /> : null,
      },
      {
        id: 'members',
        label: 'Members',
        content:
          workspaceId !== null ? (
            <MembersTab
              workspaceId={workspaceId}
              {...(user?.id !== undefined ? { currentUserId: user.id } : {})}
            />
          ) : null,
      },
      {
        id: 'invitations',
        label: 'Invitations',
        content: workspaceId !== null ? <InvitationsTab workspaceId={workspaceId} /> : null,
      },
    ],
    [workspaceId, user?.id],
  );

  if (workspaceId === null) {
    return (
      <div className="py-8 max-w-4xl mx-auto px-4 text-center">
        <Text tone="muted">No workspace selected.</Text>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 max-w-4xl mx-auto px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || workspace === null) {
    return (
      <div className="py-8 max-w-4xl mx-auto px-4">
        <Card className="p-6 text-center">
          <Text tone="muted">{error?.message ?? 'Failed to load workspace.'}</Text>
          <Button
            type="button"
            variant="text"
            className="mt-4"
            onClick={() => {
              navigate('/workspaces');
            }}
          >
            Back to Workspaces
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading as="h2" size="lg">
            {workspace.name}
          </Heading>
          <Text tone="muted" size="sm">
            {workspace.slug}
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="text-danger"
          disabled={isDeleting}
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this workspace?')) {
              remove(workspaceId);
            }
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete Workspace'}
        </Button>
      </div>

      <Tabs items={tabs} />
    </div>
  );
};
