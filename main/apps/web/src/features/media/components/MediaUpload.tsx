// main/apps/web/src/features/media/components/MediaUpload.tsx
/**
 * MediaUpload Component
 *
 * File upload component with drag-and-drop support for media files.
 */

import { formatBytes } from '@abe-stack/shared';
import { Button, FileInput, Spinner, Text } from '@abe-stack/ui';
import React, { useState } from 'react';

import { useUploadMedia } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface MediaUploadProps {
  onUploadComplete?: (mediaId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function MediaUpload({ onUploadComplete }: MediaUploadProps): React.JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { mutate, data, isLoading, isError, error, reset } = useUploadMedia();

  const handleFileSelect = (file: File | null): void => {
    setSelectedFile(file);
    reset();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    handleFileSelect(file);
  };

  const handleUpload = (): void => {
    if (selectedFile !== null) {
      mutate(selectedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (): void => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file !== undefined) {
      handleFileSelect(file);
    }
  };

  // Call onUploadComplete callback when upload succeeds
  React.useEffect(() => {
    if (data !== undefined && onUploadComplete !== undefined) {
      onUploadComplete(data.fileId);
    }
  }, [data, onUploadComplete]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-gap-md)',
      }}
    >
      {/* File Input with Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--ui-color-primary)' : 'var(--ui-color-border)'}`,
          borderRadius: 'var(--ui-radius-md)',
          padding: 'var(--ui-gap-xl)',
          backgroundColor: isDragging ? 'var(--ui-color-surface)' : 'transparent',
          transition:
            'border-color var(--ui-motion-duration-fast), background-color var(--ui-motion-duration-fast)',
        }}
      >
        <FileInput
          onChange={handleInputChange}
          aria-label="File upload input"
          style={{
            width: '100%',
            textAlign: 'center',
          }}
        />

        {selectedFile !== null && (
          <Text
            style={{
              color: 'var(--ui-color-text-muted)',
              marginTop: 'var(--ui-gap-sm)',
              textAlign: 'center',
            }}
          >
            {selectedFile.name} ({formatBytes(selectedFile.size)})
          </Text>
        )}
      </div>

      {/* Upload Button */}
      {selectedFile !== null && data === undefined && (
        <Button
          onClick={handleUpload}
          disabled={isLoading}
          style={{
            alignSelf: 'flex-start',
          }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-sm)' }}>
              <Spinner size="sm" />
              <span>Uploading...</span>
            </span>
          ) : (
            'Upload'
          )}
        </Button>
      )}

      {/* Success State */}
      {data !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--ui-gap-sm)',
            padding: 'var(--ui-gap-md)',
            backgroundColor: 'var(--ui-alert-success-bg)',
            border: '1px solid var(--ui-alert-success-border)',
            borderRadius: 'var(--ui-radius-md)',
          }}
        >
          <span
            style={{
              color: 'var(--ui-alert-success-text)',
              fontSize: 'var(--ui-font-size-lg)',
            }}
          >
            ✓
          </span>
          <Text style={{ color: 'var(--ui-alert-success-text)' }}>File uploaded successfully</Text>
        </div>
      )}

      {/* Error State */}
      {isError && error !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--ui-gap-sm)',
            padding: 'var(--ui-gap-md)',
            backgroundColor: 'var(--ui-alert-danger-bg)',
            border: '1px solid var(--ui-alert-danger-border)',
            borderRadius: 'var(--ui-radius-md)',
          }}
        >
          <Text style={{ color: 'var(--ui-alert-danger-text)' }}>
            Upload failed: {error.message}
          </Text>
        </div>
      )}
    </div>
  );
}
