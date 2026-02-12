// src/apps/web/src/features/media/components/MediaGallery.tsx
/**
 * Media Gallery
 *
 * Grid layout for browsing media items. Supports thumbnail preview,
 * status badges, and a detail dialog for each item.
 */

import { formatBytes } from '@abe-stack/shared';
import { Badge, Button, Card, EmptyState, Image, Modal, Skeleton, Text } from '@abe-stack/ui';
import { useCallback, useState, type ReactElement } from 'react';

import { useDeleteMedia } from '../hooks/useMedia';

import { MediaUpload } from './MediaUpload';

import type { MediaMetadata } from '../api';

// ============================================================================
// Types
// ============================================================================

export interface MediaGalleryProps {
  items: MediaMetadata[];
  isLoading?: boolean;
  error?: Error | null;
  onUploadSuccess?: () => void;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusTone(status: string): 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'complete':
      return 'success';
    case 'processing':
    case 'pending':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

// ============================================================================
// Component
// ============================================================================

export const MediaGallery = ({
  items,
  isLoading = false,
  error = null,
  onUploadSuccess,
  className,
}: MediaGalleryProps): ReactElement => {
  const [selectedItem, setSelectedItem] = useState<MediaMetadata | null>(null);
  const { mutate: deleteMedia, isLoading: isDeleting } = useDeleteMedia();
  const handleUploadComplete = useCallback(
    (_mediaId: string): void => {
      onUploadSuccess?.();
    },
    [onUploadSuccess],
  );

  const handleDelete = (id: string): void => {
    deleteMedia(id);
    setSelectedItem(null);
    onUploadSuccess?.();
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className ?? ''}`}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-md" />
        ))}
      </div>
    );
  }

  if (error !== null) {
    return (
      <Card className={`p-4 ${className ?? ''}`}>
        <Text tone="danger">{error.message}</Text>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <MediaUpload
          {...(onUploadSuccess !== undefined ? { onUploadComplete: handleUploadComplete } : {})}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No media files" description="Upload files to see them here" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer overflow-hidden"
              onClick={() => {
                setSelectedItem(item);
              }}
            >
              <div className="aspect-square bg-surface flex items-center justify-center overflow-hidden">
                {isImageMime(item.mimeType) && item.url !== null ? (
                  <Image
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Text tone="muted" size="sm">
                    {item.mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}
                  </Text>
                )}
              </div>
              <div className="p-2">
                <Text size="sm" className="truncate">
                  {item.filename}
                </Text>
                <div className="flex items-center justify-between mt-1">
                  <Text size="sm" tone="muted">
                    {formatBytes(item.sizeBytes)}
                  </Text>
                  <Badge tone={getStatusTone(item.processingStatus)}>{item.processingStatus}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedItem !== null && (
        <Modal.Root
          open
          onClose={() => {
            setSelectedItem(null);
          }}
        >
          <Modal.Header>
            <Modal.Title>{selectedItem.filename}</Modal.Title>
            <Modal.Close />
          </Modal.Header>

          <Modal.Body>
            <div className="space-y-4">
              {isImageMime(selectedItem.mimeType) && selectedItem.url !== null && (
                <div className="flex justify-center">
                  <Image
                    src={selectedItem.url}
                    alt={selectedItem.filename}
                    objectFit="contain"
                    className="max-w-full max-h-96 rounded"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Text size="sm" tone="muted">
                    Type
                  </Text>
                  <Text size="sm">{selectedItem.mimeType}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm" tone="muted">
                    Size
                  </Text>
                  <Text size="sm">{formatBytes(selectedItem.sizeBytes)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm" tone="muted">
                    Status
                  </Text>
                  <Badge tone={getStatusTone(selectedItem.processingStatus)}>
                    {selectedItem.processingStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <Text size="sm" tone="muted">
                    Uploaded
                  </Text>
                  <Text size="sm">{new Date(selectedItem.createdAt).toLocaleString()}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm" tone="muted">
                    ID
                  </Text>
                  <Text size="sm" className="font-mono">
                    {selectedItem.id}
                  </Text>
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              type="button"
              variant="secondary"
              className="text-danger"
              onClick={() => {
                handleDelete(selectedItem.id);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSelectedItem(null);
              }}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal.Root>
      )}
    </div>
  );
};
