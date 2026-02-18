// main/apps/web/src/features/workspace/components/WorkspaceWelcomeBanner.tsx
import { Alert, Button, Heading, Text } from '@bslt/ui';

import type { ReactElement } from 'react';

export interface WorkspaceWelcomeBannerProps {
  workspaceName: string;
  onDismiss: () => void;
  onInviteMembers: () => void;
}

export const WorkspaceWelcomeBanner = ({
  workspaceName,
  onDismiss,
  onInviteMembers,
}: WorkspaceWelcomeBannerProps): ReactElement => (
  <Alert tone="success" className="mb-6">
    <Heading as="h3" size="md" className="mb-2">
      Welcome to {workspaceName}!
    </Heading>
    <Text size="sm" className="mb-4">
      Your workspace is ready. Invite team members to start collaborating, or explore the settings
      to customize your workspace.
    </Text>
    <div className="flex gap-2">
      <Button type="button" size="small" onClick={onInviteMembers}>
        Invite Members
      </Button>
      <Button type="button" size="small" variant="secondary" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  </Alert>
);
