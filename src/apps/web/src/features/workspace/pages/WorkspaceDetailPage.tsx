// src/apps/web/src/features/workspace/pages/WorkspaceDetailPage.tsx
/**
 * Workspace Detail Page
 *
 * Displays workspace details with tabs for Settings, Members, and Invitations.
 */

import {
  Button,
  Card,
  Heading,
  Skeleton,
  Tabs,
  Text,
  useNavigate,
  useParams,
  useSearchParams,
} from '@abe-stack/ui';
import { useAuth } from '@features/auth';
import { useMemo, useState, type ReactElement } from 'react';

import {
  InvitationsList,
  InviteMemberDialog,
  MembersList,
  WebhookManagement,
  WorkspaceAuditLog,
  WorkspaceBilling,
  WorkspaceDangerZone,
  WorkspaceFeatureOverrides,
  WorkspaceSettingsForm,
  WorkspaceWelcomeBanner,
} from '../components';
import { useWorkspace } from '../hooks';

// ============================================================================
// Tab Components
// ============================================================================

const SettingsTab = ({
  workspaceId,
  onDeleted,
}: {
  workspaceId: string;
  onDeleted: () => void;
}): ReactElement => {
  const { data: workspace } = useWorkspace(workspaceId);

  if (workspace === null) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <WorkspaceSettingsForm workspace={workspace} />
      <WorkspaceDangerZone
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        onDeleted={onDeleted}
      />
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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const workspaceId = params['id'] ?? null;
  const showWelcome = searchParams.get('welcome') === '1';

  const { data: workspace, isLoading, isError, error } = useWorkspace(workspaceId);

  const tabs = useMemo(
    () => [
      {
        id: 'settings',
        label: 'Settings',
        content:
          workspaceId !== null ? (
            <SettingsTab
              workspaceId={workspaceId}
              onDeleted={() => {
                navigate('/workspaces');
              }}
            />
          ) : null,
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
      {
        id: 'billing',
        label: 'Billing',
        content: workspaceId !== null ? <WorkspaceBilling tenantId={workspaceId} /> : null,
      },
      {
        id: 'audit-log',
        label: 'Audit Log',
        content: workspaceId !== null ? <WorkspaceAuditLog tenantId={workspaceId} /> : null,
      },
      {
        id: 'feature-overrides',
        label: 'Feature Overrides',
        content: workspaceId !== null ? <WorkspaceFeatureOverrides tenantId={workspaceId} /> : null,
      },
      {
        id: 'webhooks',
        label: 'Webhooks',
        content: workspaceId !== null ? <WebhookManagement tenantId={workspaceId} /> : null,
      },
    ],
    [navigate, workspaceId, user?.id],
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
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="flex gap-2 border-b pb-2 mb-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-md" />
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

  const dismissWelcome = (): void => {
    navigate(`/workspaces/${workspaceId}`, { replace: true });
  };

  return (
    <div className="py-8 max-w-4xl mx-auto px-4">
      {showWelcome && (
        <WorkspaceWelcomeBanner
          workspaceName={workspace.name}
          onDismiss={dismissWelcome}
          onInviteMembers={() => {
            dismissWelcome();
          }}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading as="h2" size="lg">
            {workspace.name}
          </Heading>
          <Text tone="muted" size="sm">
            {workspace.slug}
          </Text>
        </div>
      </div>

      <Tabs items={tabs} />
    </div>
  );
};
