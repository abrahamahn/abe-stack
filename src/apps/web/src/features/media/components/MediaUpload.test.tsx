// src/apps/web/src/features/media/components/MediaUpload.test.tsx
/**
 * MediaUpload Component Tests
 *
 * Tests for media upload component with drag-and-drop.
 */

import { QueryCacheProvider } from '@abe-stack/client-engine';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';


import { MediaUpload } from './MediaUpload';

import type { MediaUploadResponse } from '../api';

// ============================================================================
// Test Setup
// ============================================================================

const mockUploadResponse: MediaUploadResponse = {
  fileId: 'file-123',
  storageKey: 'uploads/file-123.jpg',
  filename: 'test.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  processingJobId: 'job-456',
};

function renderComponent(props = {}): ReturnType<typeof render> {
  return render(
    <QueryCacheProvider>
      <MediaUpload {...props} />
    </QueryCacheProvider>,
  );
}

// ============================================================================
// Component Tests
// ============================================================================

describe('MediaUpload', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockUploadResponse),
        } as Response),
      ),
    );
  });

  it('should render the drop zone', () => {
    renderComponent();

    expect(screen.getByText(/drag and drop a file here/i)).toBeInTheDocument();
  });

  it('should display selected file info', () => {
    renderComponent();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/test.jpg/i)).toBeInTheDocument();
  });

  it('should show upload button when file is selected', () => {
    renderComponent();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('should upload file when button is clicked', async () => {
    renderComponent();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during upload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockUploadResponse),
              } as Response);
            }, 100);
          }),
      ),
    );

    renderComponent();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument();
    });
  });

  it('should display error message on upload failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ message: 'Invalid file type' }),
        } as Response),
      ),
    );

    renderComponent();

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it('should call onUploadComplete callback on success', async () => {
    const onUploadComplete = vi.fn();

    renderComponent({ onUploadComplete });

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('file-123');
    });
  });

  it('should handle drag and drop', () => {
    renderComponent();

    const dropZone = screen.getByText(/drag and drop a file here/i).parentElement;
    expect(dropZone).toBeInTheDocument();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dataTransfer = {
      files: [file],
    };

    if (dropZone !== null) {
      fireEvent.dragOver(dropZone, { dataTransfer });
      fireEvent.drop(dropZone, { dataTransfer });
    }

    expect(screen.getByText(/test.jpg/i)).toBeInTheDocument();
  });

  it('should format file sizes correctly', () => {
    renderComponent();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/1.0 MB/i)).toBeInTheDocument();
  });

  it('should disable upload button during upload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockUploadResponse),
              } as Response);
            }, 100);
          }),
      ),
    );

    renderComponent();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File upload input');

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /upload/i });

    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(uploadButton).toBeDisabled();
    });

    await waitFor(() => {
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument();
    });
  });

  it('should handle click on drop zone to open file selector', () => {
    renderComponent();

    const dropZone = screen.getByText(/drag and drop a file here/i).parentElement;
    const input = screen.getByLabelText('File upload input');

    const clickSpy = vi.spyOn(input, 'click');

    if (dropZone !== null) {
      fireEvent.click(dropZone);
    }

    expect(clickSpy).toHaveBeenCalled();
  });
});
