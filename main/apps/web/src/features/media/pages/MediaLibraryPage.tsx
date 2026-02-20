// main/apps/web/src/features/media/pages/MediaLibraryPage.tsx
/**
 * Media Library Page
 *
 * Full-page media library view wrapping the MediaGallery component
 * with upload dialog, type/date filter bar, and search support.
 */

import { Card, Heading, PageContainer, Select, Text } from '@bslt/ui';
import { useCallback, useMemo, useState, type ReactElement } from 'react';

import { MediaGallery } from '../components/MediaGallery';
import { MediaUpload } from '../components/MediaUpload';
import { useDeleteMedia } from '../hooks/useMedia';

import type { MediaMetadata } from '../api';

// ============================================================================
// Types
// ============================================================================

export interface MediaLibraryPageProps {
  /** Media items to display */
  items: MediaMetadata[];
  /** Whether the gallery is loading */
  isLoading?: boolean;
  /** Error to display */
  error?: Error | null;
  /** Callback to refresh data after upload or delete */
  onRefresh?: () => void;
}

/** Filter type options */
type MediaTypeFilter = 'all' | 'image' | 'audio' | 'video' | 'document';

/** Sort options */
type SortOrder = 'newest' | 'oldest' | 'largest' | 'smallest' | 'name-asc' | 'name-desc';

// ============================================================================
// Helpers
// ============================================================================

function matchesTypeFilter(mimeType: string, filter: MediaTypeFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'image':
      return mimeType.startsWith('image/');
    case 'audio':
      return mimeType.startsWith('audio/');
    case 'video':
      return mimeType.startsWith('video/');
    case 'document':
      return mimeType === 'application/pdf';
  }
}

function sortItems(items: MediaMetadata[], order: SortOrder): MediaMetadata[] {
  const sorted = [...items];
  switch (order) {
    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    case 'largest':
      return sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
    case 'smallest':
      return sorted.sort((a, b) => a.sizeBytes - b.sizeBytes);
    case 'name-asc':
      return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
    case 'name-desc':
      return sorted.sort((a, b) => b.filename.localeCompare(a.filename));
    default:
      return sorted;
  }
}

// ============================================================================
// Component
// ============================================================================

export function MediaLibraryPage({
  items,
  isLoading = false,
  error = null,
  onRefresh,
}: MediaLibraryPageProps): ReactElement {
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const { mutate: deleteMedia, isLoading: isDeleting } = useDeleteMedia();

  // Apply filters and sorting
  const filteredItems = useMemo(() => {
    let filtered = items.filter((item) => matchesTypeFilter(item.mimeType, typeFilter));

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => item.filename.toLowerCase().includes(query));
    }

    return sortItems(filtered, sortOrder);
  }, [items, typeFilter, sortOrder, searchQuery]);

  const handleUploadComplete = useCallback(
    (_mediaId: string): void => {
      onRefresh?.();
    },
    [onRefresh],
  );

  const handleDelete = useCallback(
    (id: string): void => {
      deleteMedia(id);
      onRefresh?.();
    },
    [deleteMedia, onRefresh],
  );

  const handleTypeFilterChange = useCallback((value: string): void => {
    setTypeFilter(value as MediaTypeFilter);
  }, []);

  const handleSortChange = useCallback((value: string): void => {
    setSortOrder(value as SortOrder);
  }, []);

  return (
    <PageContainer>
      {/* Page header */}
      <section style={{ marginBottom: 'var(--ui-gap-lg)' }}>
        <Heading as="h1" size="xl">
          Media Library
        </Heading>
        <Text tone="muted" style={{ marginTop: 'var(--ui-gap-xs)' }}>
          Upload, browse, and manage your media files.
        </Text>
      </section>

      {/* Filter bar */}
      <Card style={{ marginBottom: 'var(--ui-gap-lg)' }}>
        <Card.Body>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--ui-gap-md)',
            }}
          >
            {/* Search */}
            <div style={{ flex: '1 1 12rem' }}>
              <input
                type="search"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="input"
                aria-label="Search media files"
                style={{ width: '100%' }}
              />
            </div>

            {/* Type filter */}
            <div style={{ minWidth: '8rem' }}>
              <Select value={typeFilter} onChange={handleTypeFilterChange}>
                <option value="all">All types</option>
                <option value="image">Images</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="document">Documents</option>
              </Select>
            </div>

            {/* Sort order */}
            <div style={{ minWidth: '8rem' }}>
              <Select value={sortOrder} onChange={handleSortChange}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="largest">Largest first</option>
                <option value="smallest">Smallest first</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </Select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Gallery with upload slot */}
      <MediaGallery
        items={filteredItems}
        isLoading={isLoading}
        error={error}
        onDelete={handleDelete}
        isDeleting={isDeleting}
        paginated
        pageSize={12}
        uploadSlot={
          <MediaUpload
            {...(onRefresh !== undefined ? { onUploadComplete: handleUploadComplete } : {})}
          />
        }
      />
    </PageContainer>
  );
}
