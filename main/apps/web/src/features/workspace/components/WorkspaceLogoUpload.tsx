// main/apps/web/src/features/workspace/components/WorkspaceLogoUpload.tsx
/**
 * Workspace Logo Upload
 *
 * Allows workspace admins to upload/remove a logo image.
 * Reuses the AvatarUpload pattern with media API.
 */

import { MAX_LOGO_SIZE } from '@abe-stack/shared';
import { Alert, Avatar, Button, FileInput, Spinner } from '@abe-stack/ui';
import { useRef, useState, type ReactElement } from 'react';

import { useUploadMedia } from '../../media/hooks/useMedia';
import { useUpdateWorkspace } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceLogoUploadProps {
  workspaceId: string;
  currentLogoUrl: string | null;
  workspaceName: string;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceLogoUpload = ({
  workspaceId,
  currentLogoUrl,
  workspaceName,
  onSuccess,
}: WorkspaceLogoUploadProps): ReactElement => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    mutateAsync: uploadMediaAsync,
    isLoading: isUploading,
    error: uploadError,
  } = useUploadMedia();
  const {
    update,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdateWorkspace({
    onSuccess: () => {
      setPreviewUrl(null);
      setSelectedFile(null);
      onSuccess?.();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file === undefined) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev): void => {
      setPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const handleUpload = (): void => {
    if (selectedFile === null) return;
    void uploadMediaAsync(selectedFile).then((response) => {
      update(workspaceId, { logoUrl: `/api/media/${response.fileId}` });
    });
  };

  const handleRemove = (): void => {
    update(workspaceId, { logoUrl: null });
  };

  const handleCancel = (): void => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl ?? currentLogoUrl;
  const isLoading = isUploading || isUpdating;
  const error = uploadError ?? updateError;

  const initials = workspaceName
    .split(' ')
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative">
          {displayUrl !== null && displayUrl.length > 0 ? (
            <Avatar src={displayUrl} alt={`${workspaceName} logo`} className="w-16 h-16" />
          ) : (
            <div className="w-16 h-16 rounded-md bg-surface flex items-center justify-center text-xl font-medium text-muted border">
              {initials}
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <FileInput.Field
            ref={fileInputRef}
            type="file"
            label="Logo"
            hideLabel
            description="JPG, PNG, WebP or SVG. Max 2MB."
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            id="workspace-logo-upload"
          />

          {selectedFile === null ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Upload Logo
              </Button>
              {currentLogoUrl !== null && (
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="text-danger"
                >
                  Remove
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" size="small" onClick={handleUpload} disabled={isLoading}>
                {isUploading ? 'Uploading...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {error !== null && <Alert tone="danger">{error.message}</Alert>}
    </div>
  );
};
