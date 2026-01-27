// apps/web/src/features/settings/components/AvatarUpload.tsx
/**
 * Avatar Upload Component
 *
 * Component for uploading and managing user avatar.
 */

import { Alert, Avatar, Button, FileInput, Spinner } from '@abe-stack/ui';
import { useRef, useState, type ReactElement } from 'react';

import { useAvatarDelete, useAvatarUpload } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  userName: string | null;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const AvatarUpload = ({
  currentAvatarUrl,
  userName,
  onSuccess,
}: AvatarUploadProps): ReactElement => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    uploadAvatar,
    isLoading: isUploading,
    error: uploadError,
    reset: resetUpload,
  } = useAvatarUpload({
    onSuccess: () => {
      setPreviewUrl(null);
      setSelectedFile(null);
      resetUpload();
      onSuccess?.();
    },
  });

  const {
    deleteAvatar,
    isLoading: isDeleting,
    error: deleteError,
    reset: resetDelete,
  } = useAvatarDelete({
    onSuccess: () => {
      resetDelete();
      onSuccess?.();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file === undefined) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e): void => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const handleUpload = (): void => {
    if (selectedFile !== null) {
      uploadAvatar(selectedFile);
    }
  };

  const handleCancel = (): void => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (): void => {
    if (confirm('Are you sure you want to delete your avatar?')) {
      deleteAvatar();
    }
  };

  const displayUrl = previewUrl ?? currentAvatarUrl;
  const isLoading = isUploading || isDeleting;
  const error = uploadError ?? deleteError;

  // Get initials from name
  const initials =
    userName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          {displayUrl !== null && displayUrl.length > 0 ? (
            <Avatar src={displayUrl} alt={userName ?? 'User avatar'} className="w-20 h-20" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-medium text-gray-600 dark:text-gray-300">
              {initials}
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <FileInput.Field
            ref={fileInputRef}
            type="file"
            label="Avatar"
            hideLabel
            description="JPG, PNG, WebP or GIF. Max 5MB."
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
            id="avatar-upload"
          />

          {selectedFile === null ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Upload Photo
              </Button>
              {currentAvatarUrl !== null && (
                <Button
                  type="button"
                  variant="text"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" onClick={handleUpload} disabled={isLoading}>
                {isUploading ? 'Uploading...' : 'Save'}
              </Button>
              <Button type="button" variant="text" onClick={handleCancel} disabled={isLoading}>
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
