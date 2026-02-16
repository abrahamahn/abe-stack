// main/apps/web/src/features/settings/components/PasskeyManagement.tsx
/**
 * Passkey management UI for Security settings.
 * Lists registered passkeys with rename/delete actions,
 * and provides an "Add Passkey" button.
 */

import { formatDateTime } from '@abe-stack/shared';
import { Button, Card, Input, Skeleton, Text } from '@abe-stack/ui';
import { useCallback, useState, type ReactElement } from 'react';

import { usePasskeys, useRegisterPasskey } from '../../auth/hooks/useWebauthn';

import type { PasskeyListItem } from '@abe-stack/shared';

// ============================================================================
// Passkey Row
// ============================================================================

interface PasskeyRowProps {
  passkey: PasskeyListItem;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const PasskeyRow = ({ passkey, onRename, onDelete }: PasskeyRowProps): ReactElement => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(passkey.name);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = useCallback(async () => {
    if (editName.trim() === '' || editName === passkey.name) {
      setIsEditing(false);
      return;
    }
    await onRename(passkey.id, editName.trim());
    setIsEditing(false);
  }, [editName, onRename, passkey.id, passkey.name]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(passkey.id);
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, passkey.id]);

  const deviceLabel =
    passkey.deviceType === 'multiDevice'
      ? 'Synced passkey'
      : passkey.deviceType === 'singleDevice'
        ? 'Device-bound'
        : 'Passkey';

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setEditName(e.target.value);
              }}
              className="flex-1"
            />
            <Button
              size="small"
              onClick={() => {
                void handleSave();
              }}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                setIsEditing(false);
                setEditName(passkey.name);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <Text>{passkey.name}</Text>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: passkey.backedUp
                    ? 'var(--ui-badge-success-bg)'
                    : 'var(--ui-badge-neutral-bg)',
                  border: `1px solid ${passkey.backedUp ? 'var(--ui-badge-success-border)' : 'var(--ui-badge-neutral-border)'}`,
                }}
              >
                {deviceLabel}
              </span>
            </div>
            <Text size="sm" className="text-muted">
              Created {formatDateTime(passkey.createdAt)}
              {passkey.lastUsedAt !== null && ` · Last used ${formatDateTime(passkey.lastUsedAt)}`}
            </Text>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Rename
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              void handleDelete();
            }}
            disabled={isDeleting}
            className="text-danger"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      )}
    </Card>
  );
};

// ============================================================================
// PasskeyManagement
// ============================================================================

export interface PasskeyManagementProps {
  className?: string;
}

export function PasskeyManagement({ className }: PasskeyManagementProps): ReactElement {
  const { passkeys, isLoading, error, refetch, rename, remove } = usePasskeys();
  const {
    register,
    isLoading: isRegistering,
    error: registerError,
  } = useRegisterPasskey(() => {
    void refetch();
  });

  // Only render if WebAuthn is available
  const isSupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;

  if (!isSupported) {
    return (
      <div className={className}>
        <Text className="text-muted">Passkeys are not supported in this browser.</Text>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton height="4rem" className="mb-2" />
        <Skeleton height="4rem" />
      </div>
    );
  }

  return (
    <div className={className}>
      {error !== null && (
        <Text tone="danger" className="mb-4">
          {error}
        </Text>
      )}
      {registerError !== null && (
        <Text tone="danger" className="mb-4">
          {registerError}
        </Text>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {passkeys.length === 0 ? (
          <Text className="text-muted">No passkeys registered yet.</Text>
        ) : (
          passkeys.map((pk) => (
            <PasskeyRow key={pk.id} passkey={pk} onRename={rename} onDelete={remove} />
          ))
        )}
      </div>

      <Button
        onClick={() => {
          void register();
        }}
        disabled={isRegistering}
      >
        {isRegistering ? 'Registering...' : 'Add Passkey'}
      </Button>
    </div>
  );
}
