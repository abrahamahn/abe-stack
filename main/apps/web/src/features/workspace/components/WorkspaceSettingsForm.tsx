// main/apps/web/src/features/workspace/components/WorkspaceSettingsForm.tsx
/**
 * Workspace Settings Form
 *
 * Form for editing workspace name and settings.
 */

import { Alert, Button, FormField, Input } from '@abe-stack/ui';
import { useState, type ReactElement, type ChangeEvent } from 'react';

import { useUpdateWorkspace } from '../hooks';

import { DomainAllowlistEditor } from './DomainAllowlistEditor';
import { WorkspaceLogoUpload } from './WorkspaceLogoUpload';

import type { Tenant } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceSettingsFormProps {
  workspace: Tenant;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceSettingsForm = ({
  workspace,
  onSuccess,
}: WorkspaceSettingsFormProps): ReactElement => {
  const [name, setName] = useState(workspace.name);
  const [allowedDomains, setAllowedDomains] = useState<string[]>(
    workspace.allowedEmailDomains ?? [],
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { update, isLoading, error, reset } = useUpdateWorkspace({
    onSuccess: () => {
      setSuccessMessage('Workspace updated successfully');
      reset();
      onSuccess?.();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSuccessMessage(null);
    update(workspace.id, {
      name: name.trim(),
      allowedEmailDomains: allowedDomains,
    });
  };

  const initialDomains = workspace.allowedEmailDomains ?? [];
  const domainsChanged =
    allowedDomains.length !== initialDomains.length ||
    allowedDomains.some((d, i) => d !== initialDomains[i]);
  const hasChanges = name.trim() !== workspace.name || domainsChanged;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <WorkspaceLogoUpload
        workspaceId={workspace.id}
        currentLogoUrl={(workspace as Tenant & { logoUrl?: string | null }).logoUrl ?? null}
        workspaceName={workspace.name}
      />

      <FormField label="Workspace Name" htmlFor="ws-name">
        <Input
          id="ws-name"
          type="text"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
          }}
          placeholder="Workspace name"
          maxLength={100}
          required
        />
      </FormField>

      <FormField label="Slug" htmlFor="ws-slug">
        <Input id="ws-slug" type="text" value={workspace.slug} disabled className="bg-surface" />
      </FormField>

      <DomainAllowlistEditor
        domains={allowedDomains}
        onChange={setAllowedDomains}
        disabled={isLoading}
      />

      {error !== null && <Alert tone="danger">{error.message}</Alert>}
      {successMessage !== null && <Alert tone="success">{successMessage}</Alert>}

      <div className="flex justify-end">
        <Button type="submit" disabled={!hasChanges || isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
