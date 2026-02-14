// main/apps/web/src/features/dashboard/components/GettingStartedChecklist.tsx
import { useLocalStorageValue } from '@abe-stack/react/hooks';
import { useNavigate } from '@abe-stack/react/router';
import { Button, Card, Heading, Text } from '@abe-stack/ui';
import { useAuth } from '@auth';
import { useWorkspaces } from '@features/workspace';
import { useCallback } from 'react';

import type { JSX } from 'react';

const DISMISSED_KEY = 'abe:getting-started-dismissed';

interface ChecklistItem {
  label: string;
  complete: boolean;
  action: string;
  path: string;
}

export const GettingStartedChecklist = (): JSX.Element | null => {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces();
  const navigate = useNavigate();
  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

  const [dismissedState, setDismissedState] = useLocalStorageValue(DISMISSED_KEY);
  const dismissed = dismissedState === 'true';

  const handleDismiss = useCallback(() => {
    setDismissedState('true');
  }, [setDismissedState]);

  const items: ChecklistItem[] = [
    {
      label: 'Complete your profile',
      complete: user !== null && firstName.length > 0 && lastName.length > 0,
      action: 'Go to Settings',
      path: '/settings/profile',
    },
    {
      label: 'Upload an avatar',
      complete: user?.avatarUrl !== null && user?.avatarUrl !== undefined,
      action: 'Upload Avatar',
      path: '/settings/profile',
    },
    {
      label: 'Create a workspace',
      complete: safeWorkspaces.length > 0,
      action: 'Create Workspace',
      path: '/workspaces',
    },
    {
      label: 'Invite a teammate',
      complete: safeWorkspaces.length > 1,
      action: 'Invite Member',
      path: '/workspaces',
    },
  ];

  const allComplete = items.every((item) => item.complete);

  if (dismissed || allComplete) return null;

  const completedCount = items.filter((item) => item.complete).length;

  return (
    <Card>
      <div className="flex-between mb-3">
        <Heading as="h3" size="sm">
          Getting Started
        </Heading>
        <Button variant="text" size="small" onClick={handleDismiss}>
          Dismiss
        </Button>
      </div>
      <Text tone="muted" className="mb-3">
        {completedCount} of {items.length} steps completed
      </Text>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3"
            style={{
              padding: 'var(--ui-gap-sm) var(--ui-gap-md)',
              borderRadius: 'var(--ui-radius-sm)',
              backgroundColor: item.complete
                ? 'var(--ui-alert-success-bg)'
                : 'var(--ui-color-surface)',
            }}
          >
            <span
              style={{
                width: '1.25rem',
                height: '1.25rem',
                borderRadius: 'var(--ui-radius-full)',
                border: item.complete ? 'none' : '1px solid var(--ui-color-border)',
                backgroundColor: item.complete ? 'var(--ui-color-success)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--ui-color-text-inverse)',
                fontSize: 'var(--ui-font-size-xs)',
              }}
            >
              {item.complete ? '\u2713' : ''}
            </span>
            <Text
              style={{
                flex: 1,
                textDecoration: item.complete ? 'line-through' : 'none',
                color: item.complete ? 'var(--ui-color-text-muted)' : 'var(--ui-color-text)',
              }}
            >
              {item.label}
            </Text>
            {!item.complete && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  navigate(item.path);
                }}
              >
                {item.action}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
