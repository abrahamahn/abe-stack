// main/client/ui/src/components/media/MediaGallery.tsx
/**
 * Media Gallery Component
 *
 * A reusable grid layout for displaying media items with thumbnails,
 * file type icons, preview dialog, pagination, loading skeletons,
 * and empty/error states. Framework-agnostic -- no API or hook dependencies.
 *
 * @module Components/Media/MediaGallery
 */

import { Badge } from '@elements/Badge';
import { Button } from '@elements/Button';
import { Skeleton } from '@elements/Skeleton';
import { Text } from '@elements/Text';
import { Modal } from '@layers/Modal';
import { cn } from '@utils/cn';
import { useCallback, useState, type ReactElement, type ReactNode } from 'react';

import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { Image } from '../Image';
import { Pagination } from '../Pagination';

import '../../styles/components.css';

// ============================================================================
// Types
// ============================================================================

/** A single media item for display in the gallery. */
export interface MediaGalleryItem {
  /** Unique identifier */
  readonly id: string;
  /** Display filename */
  readonly filename: string;
  /** MIME type (e.g., 'image/jpeg', 'audio/mp3') */
  readonly mimeType: string;
  /** File size in bytes */
  readonly sizeBytes: number;
  /** Thumbnail or full image URL (null if not available) */
  readonly url: string | null;
  /** Processing status */
  readonly processingStatus: 'pending' | 'processing' | 'complete' | 'failed';
  /** ISO timestamp of upload */
  readonly createdAt: string;
}

/** Props for the MediaGallery component. */
export interface MediaGalleryProps {
  /** Array of media items to display */
  items: MediaGalleryItem[];
  /** Whether the gallery is currently loading */
  isLoading?: boolean;
  /** Error to display (replaces gallery content) */
  error?: Error | null;
  /** Number of skeleton placeholders during loading @default 8 */
  skeletonCount?: number;
  /** Number of columns in the grid @default 4 */
  columns?: 2 | 3 | 4 | 5 | 6;
  /** Enable pagination @default false */
  paginated?: boolean;
  /** Items per page when paginated @default 12 */
  pageSize?: number;
  /** Callback when an item is clicked */
  onItemClick?: (item: MediaGalleryItem) => void;
  /** Callback when delete is requested on an item */
  onDelete?: (id: string) => void;
  /** Whether a delete operation is in progress */
  isDeleting?: boolean;
  /** Render prop for custom upload button area */
  uploadSlot?: ReactNode;
  /** Additional CSS class names */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Map processing status to Badge tone. */
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

/** Check if a MIME type is an image. */
function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

/** Check if a MIME type is a video. */
function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}

/** Check if a MIME type is audio. */
function isAudioMime(mime: string): boolean {
  return mime.startsWith('audio/');
}

/** Get a short display label for a file type. */
function getFileTypeLabel(mime: string): string {
  if (isImageMime(mime)) return 'IMG';
  if (isVideoMime(mime)) return 'VID';
  if (isAudioMime(mime)) return 'AUD';
  if (mime === 'application/pdf') return 'PDF';
  const sub = mime.split('/')[1];
  return sub?.toUpperCase().slice(0, 4) ?? 'FILE';
}

/** Get a file type icon character for non-image files. */
function getFileTypeIcon(mime: string): string {
  if (isVideoMime(mime)) return '\u25B6'; // play triangle
  if (isAudioMime(mime)) return '\u266B'; // beamed eighth notes
  if (mime === 'application/pdf') return '\u2B1A'; // document outline
  return '\u2B1C'; // white large square
}

/** Format bytes to a human-readable string. */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : String(Math.round(value))} ${units[i] ?? 'B'}`;
}

// ============================================================================
// Sub-components
// ============================================================================

/** Loading skeleton grid. */
function GallerySkeleton({ count, columns }: { count: number; columns: number }): ReactElement {
  return (
    <div
      className="media-gallery-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${String(columns)}, 1fr)`,
        gap: 'var(--ui-gap-md)',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-xs)' }}>
          <Skeleton
            style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 'var(--ui-radius-md)' }}
          />
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      ))}
    </div>
  );
}

/** File type icon placeholder for non-image media. */
function FileTypePlaceholder({ mimeType }: { mimeType: string }): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--ui-gap-xs)',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--ui-color-surface)',
      }}
    >
      <span
        style={{ fontSize: 'var(--ui-font-size-xl)', color: 'var(--ui-color-text-muted)' }}
        aria-hidden="true"
      >
        {getFileTypeIcon(mimeType)}
      </span>
      <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-xs)' }}>
        {getFileTypeLabel(mimeType)}
      </Text>
    </div>
  );
}

/** Detail row for the preview modal. */
function DetailRow({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--ui-gap-xs) 0',
      }}
    >
      <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
        {label}
      </Text>
      <div>{children}</div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * A media library/gallery component displaying a grid of uploaded media items.
 *
 * Features:
 * - Grid layout with configurable columns
 * - Image thumbnails with lazy loading
 * - File type icons for non-image files (audio, video, PDF, etc.)
 * - Click to preview/expand in a modal dialog
 * - Delete action per item
 * - Loading skeleton state
 * - Empty state with configurable upload slot
 * - Optional pagination
 *
 * @example
 * ```tsx
 * <MediaGallery
 *   items={mediaItems}
 *   isLoading={isLoading}
 *   onDelete={handleDelete}
 *   uploadSlot={<UploadButton />}
 * />
 * ```
 */
export function MediaGallery({
  items,
  isLoading = false,
  error = null,
  skeletonCount = 8,
  columns = 4,
  paginated = false,
  pageSize = 12,
  onItemClick,
  onDelete,
  isDeleting = false,
  uploadSlot,
  className,
}: MediaGalleryProps): ReactElement {
  const [selectedItem, setSelectedItem] = useState<MediaGalleryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleItemClick = useCallback(
    (item: MediaGalleryItem): void => {
      setSelectedItem(item);
      onItemClick?.(item);
    },
    [onItemClick],
  );

  const handleClose = useCallback((): void => {
    setSelectedItem(null);
  }, []);

  const handleDelete = useCallback(
    (id: string): void => {
      onDelete?.(id);
      setSelectedItem(null);
    },
    [onDelete],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('media-gallery', className)}>
        {uploadSlot !== undefined ? (
          <div style={{ marginBottom: 'var(--ui-gap-md)' }}>{uploadSlot}</div>
        ) : null}
        <GallerySkeleton count={skeletonCount} columns={columns} />
      </div>
    );
  }

  // Error state
  if (error !== null) {
    return (
      <div className={cn('media-gallery', className)}>
        <Card>
          <Card.Body>
            <Text tone="danger">{error.message}</Text>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Pagination
  const totalPages = paginated ? Math.max(1, Math.ceil(items.length / pageSize)) : 1;
  const displayItems = paginated
    ? items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : items;

  return (
    <div className={cn('media-gallery', className)}>
      {/* Upload slot */}
      {uploadSlot !== undefined ? (
        <div style={{ marginBottom: 'var(--ui-gap-md)' }}>{uploadSlot}</div>
      ) : null}

      {/* Empty state */}
      {items.length === 0 ? (
        <EmptyState
          title="No media files"
          description="Upload files to see them here."
          {...(uploadSlot === undefined
            ? { action: { label: 'Upload Media', onClick: () => {} } }
            : {})}
        />
      ) : (
        <>
          {/* Grid */}
          <div
            className="media-gallery-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${String(columns)}, 1fr)`,
              gap: 'var(--ui-gap-md)',
            }}
            role="list"
            aria-label="Media gallery"
          >
            {displayItems.map((item) => (
              <Card
                key={item.id}
                role="listitem"
                tabIndex={0}
                aria-label={item.filename}
                style={{ cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => {
                  handleItemClick(item);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
              >
                {/* Thumbnail / Icon area */}
                <div
                  style={{
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    backgroundColor: 'var(--ui-color-surface)',
                  }}
                >
                  {isImageMime(item.mimeType) && item.url !== null ? (
                    <Image
                      src={item.url}
                      alt={item.filename}
                      objectFit="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <FileTypePlaceholder mimeType={item.mimeType} />
                  )}
                </div>

                {/* Info area */}
                <div style={{ padding: 'var(--ui-gap-sm)' }}>
                  <Text
                    style={{
                      fontSize: 'var(--ui-font-size-sm)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.filename}
                  </Text>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'var(--ui-gap-xs)',
                    }}
                  >
                    <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-xs)' }}>
                      {formatBytes(item.sizeBytes)}
                    </Text>
                    <Badge tone={getStatusTone(item.processingStatus)}>
                      {item.processingStatus}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {paginated && totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 'var(--ui-gap-lg)',
              }}
            >
              <Pagination
                value={currentPage}
                totalPages={totalPages}
                onChange={setCurrentPage}
                ariaLabel="Media gallery pagination"
              />
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {selectedItem !== null && (
        <Modal.Root open onClose={handleClose}>
          <Modal.Header>
            <Modal.Title>{selectedItem.filename}</Modal.Title>
            <Modal.Close />
          </Modal.Header>

          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}>
              {/* Preview area */}
              {isImageMime(selectedItem.mimeType) && selectedItem.url !== null && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Image
                    src={selectedItem.url}
                    alt={selectedItem.filename}
                    objectFit="contain"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '24rem',
                      borderRadius: 'var(--ui-radius-md)',
                    }}
                  />
                </div>
              )}

              {!isImageMime(selectedItem.mimeType) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--ui-gap-xl)',
                    backgroundColor: 'var(--ui-color-surface)',
                    borderRadius: 'var(--ui-radius-md)',
                  }}
                >
                  <FileTypePlaceholder mimeType={selectedItem.mimeType} />
                </div>
              )}

              {/* Metadata details */}
              <div
                style={{
                  borderTop: '1px solid var(--ui-color-border)',
                  paddingTop: 'var(--ui-gap-sm)',
                }}
              >
                <DetailRow label="Type">
                  <Text style={{ fontSize: 'var(--ui-font-size-sm)' }}>
                    {selectedItem.mimeType}
                  </Text>
                </DetailRow>
                <DetailRow label="Size">
                  <Text style={{ fontSize: 'var(--ui-font-size-sm)' }}>
                    {formatBytes(selectedItem.sizeBytes)}
                  </Text>
                </DetailRow>
                <DetailRow label="Status">
                  <Badge tone={getStatusTone(selectedItem.processingStatus)}>
                    {selectedItem.processingStatus}
                  </Badge>
                </DetailRow>
                <DetailRow label="Uploaded">
                  <Text style={{ fontSize: 'var(--ui-font-size-sm)' }}>
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </Text>
                </DetailRow>
                <DetailRow label="ID">
                  <Text
                    style={{
                      fontSize: 'var(--ui-font-size-xs)',
                      fontFamily: 'var(--ui-font-family-mono)',
                    }}
                  >
                    {selectedItem.id}
                  </Text>
                </DetailRow>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            {onDelete !== undefined && (
              <Button
                variant="secondary"
                onClick={() => {
                  handleDelete(selectedItem.id);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Root>
      )}
    </div>
  );
}
