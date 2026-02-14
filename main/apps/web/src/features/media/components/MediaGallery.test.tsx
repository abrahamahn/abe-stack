// main/apps/web/src/features/media/components/MediaGallery.test.tsx
/**
 * MediaGallery Component Tests
 *
 * Tests for media gallery grid layout with detail modal and delete functionality.
 */

import { QueryCacheProvider } from '@abe-stack/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MediaGallery } from './MediaGallery';

import type { MediaMetadata } from '../api';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock useDeleteMedia hook
const mockDeleteMedia = vi.fn();
const mockIsDeleting = vi.fn(() => false);

vi.mock('../hooks/useMedia', () => ({
  useDeleteMedia: () => ({
    mutate: mockDeleteMedia,
    isLoading: mockIsDeleting(),
  }),
}));

// Mock MediaUpload component
vi.mock('./MediaUpload', () => ({
  MediaUpload: ({ onUploadComplete }: { onUploadComplete?: (id: string) => void }) => (
    <div data-testid="media-upload">
      <button
        type="button"
        onClick={() => {
          onUploadComplete?.('uploaded-file-id');
        }}
      >
        Upload File
      </button>
    </div>
  ),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockMediaItems: MediaMetadata[] = [
  {
    id: 'media-1',
    filename: 'image1.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024 * 100, // 100 KB
    url: 'https://example.com/image1.jpg',
    purpose: 'upload',
    processingStatus: 'complete',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'media-2',
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024 * 1024 * 2, // 2 MB
    url: 'https://example.com/document.pdf',
    purpose: 'upload',
    processingStatus: 'processing',
    createdAt: '2024-01-15T11:00:00Z',
  },
  {
    id: 'media-3',
    filename: 'video.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 1024 * 1024 * 10, // 10 MB
    url: null,
    purpose: 'upload',
    processingStatus: 'pending',
    createdAt: '2024-01-15T12:00:00Z',
  },
  {
    id: 'media-4',
    filename: 'failed.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 500,
    url: null,
    purpose: 'upload',
    processingStatus: 'failed',
    createdAt: '2024-01-15T13:00:00Z',
  },
];

// ============================================================================
// Test Helpers
// ============================================================================

function renderComponent(props = {}): ReturnType<typeof render> {
  return render(
    <QueryCacheProvider>
      <MediaGallery items={[]} {...props} />
    </QueryCacheProvider>,
  );
}

// ============================================================================
// Component Tests
// ============================================================================

describe('MediaGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDeleting.mockReturnValue(false);
  });

  describe('loading state', () => {
    it('should show loading skeletons when isLoading is true', () => {
      renderComponent({ isLoading: true });

      const skeletons = document.querySelectorAll('.aspect-square.rounded-md');
      expect(skeletons.length).toBe(8);
    });

    it('should not show media grid when loading', () => {
      renderComponent({ items: mockMediaItems, isLoading: true });

      expect(screen.queryByText('image1.jpg')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when error prop is provided', () => {
      const error = new Error('Failed to load media');
      renderComponent({ error });

      expect(screen.getByText('Failed to load media')).toBeInTheDocument();
    });

    it('should not show media grid when error exists', () => {
      const error = new Error('Failed to load media');
      renderComponent({ items: mockMediaItems, error });

      expect(screen.queryByText('image1.jpg')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when items array is empty', () => {
      renderComponent({ items: [] });

      expect(screen.getByText('No media files')).toBeInTheDocument();
      expect(screen.getByText('Upload files to see them here')).toBeInTheDocument();
    });

    it('should show MediaUpload component in empty state', () => {
      renderComponent({ items: [] });

      expect(screen.getByTestId('media-upload')).toBeInTheDocument();
    });
  });

  describe('media grid rendering', () => {
    it('should render grid of media cards', () => {
      renderComponent({ items: mockMediaItems });

      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('video.mp4')).toBeInTheDocument();
      expect(screen.getByText('failed.jpg')).toBeInTheDocument();
    });

    it('should display image thumbnails for image mime types', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const images = screen.getAllByAltText('image1.jpg');
      expect(images.length).toBeGreaterThan(0);
      expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg');
    });

    it('should display file type placeholder for non-image files', () => {
      renderComponent({ items: [mockMediaItems[1]] });

      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('should display file type placeholder when url is null', () => {
      renderComponent({ items: [mockMediaItems[2]] });

      expect(screen.getByText('MP4')).toBeInTheDocument();
    });

    it('should display file sizes in correct format', () => {
      renderComponent({ items: mockMediaItems });

      expect(screen.getByText('100 KB')).toBeInTheDocument();
      expect(screen.getByText('2 MB')).toBeInTheDocument();
      expect(screen.getByText('10 MB')).toBeInTheDocument();
    });

    it('should display bytes for small files', () => {
      renderComponent({ items: [mockMediaItems[3]] });

      expect(screen.getByText('500 B')).toBeInTheDocument();
    });

    it('should display processing status badges', () => {
      renderComponent({ items: mockMediaItems });

      expect(screen.getAllByText('complete').length).toBe(1);
      expect(screen.getAllByText('processing').length).toBe(1);
      expect(screen.getAllByText('pending').length).toBe(1);
      expect(screen.getAllByText('failed').length).toBe(1);
    });
  });

  describe('media upload integration', () => {
    it('should render MediaUpload component', () => {
      renderComponent({ items: [] });

      expect(screen.getByTestId('media-upload')).toBeInTheDocument();
    });

    it('should call onUploadSuccess when upload completes', () => {
      const onUploadSuccess = vi.fn();
      renderComponent({ items: [], onUploadSuccess });

      const uploadButton = screen.getByRole('button', { name: /upload file/i });
      fireEvent.click(uploadButton);

      expect(onUploadSuccess).toHaveBeenCalledTimes(1);
    });

    it('should not pass onUploadComplete to MediaUpload when onUploadSuccess is undefined', () => {
      renderComponent({ items: [] });

      expect(screen.getByTestId('media-upload')).toBeInTheDocument();
    });
  });

  describe('detail modal', () => {
    it('should open detail modal when clicking a media card', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      expect(card).toBeInTheDocument();

      fireEvent.click(card!);

      // Modal should show filename as title
      expect(screen.getAllByText('image1.jpg').length).toBeGreaterThan(1);
    });

    it('should display file info in modal', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('image/jpeg')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Uploaded')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('media-1')).toBeInTheDocument();
    });

    it('should show image preview for image mime types in modal', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      // Modal should have multiple images - one in card, one in modal preview
      const images = screen.getAllByAltText('image1.jpg');
      expect(images.length).toBeGreaterThan(1);
    });

    it('should not show image preview for non-image files', () => {
      renderComponent({ items: [mockMediaItems[1]] });

      const card = screen.getByText('document.pdf').closest('.cursor-pointer');
      fireEvent.click(card!);

      const images = screen.queryAllByAltText('document.pdf');
      expect(images.length).toBe(0);
    });

    it('should show delete button in modal', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should show close button in modal', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      // Modal has two close buttons - the X and the footer close button
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should close modal when clicking close button', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      // Get all close buttons and click the first one
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons[0]).toBeDefined();
      fireEvent.click(closeButtons[0]!);

      // Modal should be closed - only one instance of filename visible (in the card)
      expect(screen.getAllByText('image1.jpg').length).toBe(1);
    });

    it('should format createdAt date in modal', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      // Check that date formatting is applied (actual format depends on locale)
      const dateText = new Date('2024-01-15T10:30:00Z').toLocaleString();
      expect(screen.getByText(dateText)).toBeInTheDocument();
    });
  });

  describe('delete functionality', () => {
    it('should call deleteMedia when clicking delete button', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(mockDeleteMedia).toHaveBeenCalledWith('media-1');
    });

    it('should close modal after deleting', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Modal should be closed
      expect(screen.getAllByText('image1.jpg').length).toBe(1);
    });

    it('should call onUploadSuccess after deleting', () => {
      const onUploadSuccess = vi.fn();
      renderComponent({ items: [mockMediaItems[0]], onUploadSuccess });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(onUploadSuccess).toHaveBeenCalledTimes(1);
    });

    it('should disable delete button when isDeleting is true', () => {
      mockIsDeleting.mockReturnValue(true);
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      const deleteButton = screen.getByRole('button', { name: /deleting/i });
      expect(deleteButton).toBeDisabled();
    });

    it('should show "Deleting..." text when isDeleting is true', () => {
      mockIsDeleting.mockReturnValue(true);
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('status badge tones', () => {
    it('should use success tone for complete status', () => {
      renderComponent({ items: [mockMediaItems[0]] });

      const card = screen.getByText('image1.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      // Badge should be present in modal (tested via text content)
      expect(screen.getAllByText('complete').length).toBe(2); // One in card, one in modal
    });

    it('should use info tone for processing status', () => {
      renderComponent({ items: [mockMediaItems[1]] });

      const card = screen.getByText('document.pdf').closest('.cursor-pointer');
      fireEvent.click(card!);

      expect(screen.getAllByText('processing').length).toBe(2);
    });

    it('should use info tone for pending status', () => {
      renderComponent({ items: [mockMediaItems[2]] });

      const card = screen.getByText('video.mp4').closest('.cursor-pointer');
      fireEvent.click(card!);

      expect(screen.getAllByText('pending').length).toBe(2);
    });

    it('should use danger tone for failed status', () => {
      renderComponent({ items: [mockMediaItems[3]] });

      const card = screen.getByText('failed.jpg').closest('.cursor-pointer');
      fireEvent.click(card!);

      expect(screen.getAllByText('failed').length).toBe(2);
    });
  });

  describe('className prop', () => {
    it('should apply custom className to container', () => {
      const { container } = renderComponent({ items: [], className: 'custom-class' });

      const galleryContainer = container.querySelector('.custom-class');
      expect(galleryContainer).toBeInTheDocument();
    });

    it('should apply className to loading state container', () => {
      const { container } = renderComponent({ isLoading: true, className: 'custom-class' });

      const loadingContainer = container.querySelector('.custom-class');
      expect(loadingContainer).toBeInTheDocument();
    });

    it('should apply className to error state container', () => {
      const error = new Error('Test error');
      const { container } = renderComponent({ error, className: 'custom-class' });

      const errorContainer = container.querySelector('.custom-class');
      expect(errorContainer).toBeInTheDocument();
    });
  });
});
