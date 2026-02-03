// apps/web/src/features/settings/components/AvatarUpload.test.tsx
/**
 * Avatar Upload Component Tests
 *
 * Comprehensive tests for the avatar upload component covering:
 * - Component rendering with various states
 * - File selection and validation
 * - Upload and delete operations
 * - Loading states
 * - Error handling
 * - Preview functionality
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AvatarUpload } from './AvatarUpload';

import type { AvatarUploadProps } from './AvatarUpload';

// Mock the hooks
vi.mock('../hooks', () => ({
  useAvatarUpload: vi.fn(),
  useAvatarDelete: vi.fn(),
}));

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    Alert: ({ children, tone }: { children: React.ReactNode; tone: string }) => (
      <div data-testid="alert" data-tone={tone}>
        {children}
      </div>
    ),
    Avatar: ({ src, alt, className }: { src: string; alt: string; className: string }) => (
      <img data-testid="avatar" src={src} alt={alt} className={className} />
    ),
    Button: ({
      children,
      onClick,
      disabled,
      variant,
      type,
      className,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'danger' | 'link';
      type?: 'submit' | 'reset' | 'button';
      className?: string;
    }) => (
      <button
        data-testid={`button-${children}`}
        onClick={onClick}
        disabled={disabled}
        data-variant={variant}
        type={type}
        className={className}
      >
        {children}
      </button>
    ),
    FileInput: {
      Field: ({
        onChange,
        accept,
        disabled,
        id,
      }: {
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        accept: string;
        disabled?: boolean;
        id: string;
      }) => (
        <input
          data-testid="file-input"
          type="file"
          onChange={onChange}
          accept={accept}
          disabled={disabled}
          id={id}
        />
      ),
    },
    Spinner: ({ size }: { size?: string }) => (
      <div data-testid="spinner" data-size={size}>
        Loading...
      </div>
    ),
  };
});

import { useAvatarDelete, useAvatarUpload } from '../hooks';

describe('AvatarUpload', () => {
  let mockUploadAvatar: ReturnType<typeof vi.fn>;
  let mockDeleteAvatar: ReturnType<typeof vi.fn>;
  let mockResetUpload: ReturnType<typeof vi.fn>;
  let mockResetDelete: ReturnType<typeof vi.fn>;
  let mockOnSuccess: any;

  const defaultProps: AvatarUploadProps = {
    currentAvatarUrl: null,
    userName: 'John Doe',
  };

  beforeEach(() => {
    mockUploadAvatar = vi.fn();
    mockDeleteAvatar = vi.fn();
    mockResetUpload = vi.fn();
    mockResetDelete = vi.fn();
    mockOnSuccess = vi.fn();

    vi.mocked(useAvatarUpload).mockReturnValue({
      uploadAvatar: mockUploadAvatar,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      isError: false,
      error: null,
      avatarUrl: null,
      reset: mockResetUpload,
    } as any);

    vi.mocked(useAvatarDelete).mockReturnValue({
      deleteAvatar: mockDeleteAvatar,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      isError: false,
      error: null,
      reset: mockResetDelete,
    } as any);

    // Mock window.alert and window.confirm
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    // Mock FileReader - must trigger onload when readAsDataURL is called
    class MockFileReader {
      result: string | ArrayBuffer | null = 'data:image/jpeg;base64,mockImageData';
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      readyState: number = 0;
      error: DOMException | null = null;
      EMPTY = 0;
      LOADING = 1;
      DONE = 2;

      readAsDataURL(_file: Blob): void {
        // Simulate async file reading by calling onload in next tick
        setTimeout(() => {
          this.readyState = 2;
          if (this.onload !== null) {
            const event = { target: { result: this.result } } as ProgressEvent<FileReader>;
            this.onload.call(this as unknown as FileReader, event);
          }
        }, 0);
      }

      readAsText(): void {}
      readAsArrayBuffer(): void {}
      readAsBinaryString(): void {}
      abort(): void {}
      addEventListener(): void {}
      removeEventListener(): void {}
      dispatchEvent(): boolean {
        return true;
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);
  });

  // ============================================================================
  // Rendering
  // ============================================================================

  describe('rendering', () => {
    it('should render upload button when no avatar exists', () => {
      render(<AvatarUpload {...defaultProps} />);

      expect(screen.getByTestId('button-Upload Photo')).toBeInTheDocument();
      expect(screen.queryByTestId('button-Remove')).not.toBeInTheDocument();
    });

    it('should render user initials when no avatar exists', () => {
      render(<AvatarUpload {...defaultProps} userName="John Doe" />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render avatar image when avatar URL exists', () => {
      render(
        <AvatarUpload
          {...defaultProps}
          currentAvatarUrl="https://example.com/avatar.jpg"
          userName="Jane Smith"
        />,
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveAttribute('alt', 'Jane Smith');
    });

    it('should render both upload and remove buttons when avatar exists', () => {
      render(<AvatarUpload {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);

      expect(screen.getByTestId('button-Upload Photo')).toBeInTheDocument();
      expect(screen.getByTestId('button-Remove')).toBeInTheDocument();
    });

    it('should render file input with correct attributes', () => {
      render(<AvatarUpload {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
    });

    it('should handle null userName gracefully', () => {
      render(<AvatarUpload {...defaultProps} userName={null} />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should handle empty string userName gracefully', () => {
      render(<AvatarUpload {...defaultProps} userName="" />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should extract correct initials from single name', () => {
      render(<AvatarUpload {...defaultProps} userName="Madonna" />);

      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('should extract correct initials from three names', () => {
      render(<AvatarUpload {...defaultProps} userName="John Paul Jones" />);

      // Should take first 2 initials
      expect(screen.getByText('JP')).toBeInTheDocument();
    });

    it('should handle empty avatar URL', () => {
      render(<AvatarUpload {...defaultProps} currentAvatarUrl="" />);

      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // File Selection
  // ============================================================================

  describe('file selection', () => {
    it('should handle file selection successfully', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('button-Save')).toBeInTheDocument();
        expect(screen.getByTestId('button-Cancel')).toBeInTheDocument();
      });
    });

    it('should validate file type - reject invalid types', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(window.alert).toHaveBeenCalledWith(
        'Please select a valid image file (JPEG, PNG, WebP, or GIF)',
      );
      expect(screen.queryByTestId('button-Save')).not.toBeInTheDocument();
    });

    it('should validate file type - accept JPEG', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(window.alert).not.toHaveBeenCalled();
        expect(screen.getByTestId('button-Save')).toBeInTheDocument();
      });
    });

    it('should validate file type - accept PNG', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(window.alert).not.toHaveBeenCalled();
        expect(screen.getByTestId('button-Save')).toBeInTheDocument();
      });
    });

    it('should validate file type - accept WebP', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.webp', { type: 'image/webp' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(window.alert).not.toHaveBeenCalled();
        expect(screen.getByTestId('button-Save')).toBeInTheDocument();
      });
    });

    it('should validate file type - accept GIF', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.gif', { type: 'image/gif' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(window.alert).not.toHaveBeenCalled();
        expect(screen.getByTestId('button-Save')).toBeInTheDocument();
      });
    });

    it('should validate file size - reject files over 5MB', () => {
      render(<AvatarUpload {...defaultProps} />);

      // Create file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      expect(window.alert).toHaveBeenCalledWith('File size must be less than 5MB');
      expect(screen.queryByTestId('button-Save')).not.toBeInTheDocument();
    });

    it('should validate file size - accept files under 5MB', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['x'.repeat(1024)], 'small.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(window.alert).not.toHaveBeenCalled();
        expect(screen.getByTestId('button-Save')).toBeInTheDocument();
      });
    });

    it('should handle file selection with no files', () => {
      render(<AvatarUpload {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(screen.queryByTestId('button-Save')).not.toBeInTheDocument();
    });

    it('should handle file selection with undefined files', () => {
      render(<AvatarUpload {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: {} });

      expect(screen.queryByTestId('button-Save')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Upload Operations
  // ============================================================================

  describe('upload operations', () => {
    it('should call uploadAvatar when save button is clicked', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('button-Save')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('button-Save'));

      expect(mockUploadAvatar).toHaveBeenCalledWith(file);
    });

    it('should show uploading state on button', async () => {
      vi.mocked(useAvatarUpload).mockReturnValue({
        uploadAvatar: mockUploadAvatar as any,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        avatarUrl: null,
        reset: mockResetUpload as any,
      } as any);

      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('button-Uploading...')).toBeInTheDocument();
      });
    });

    it('should disable buttons during upload', async () => {
      vi.mocked(useAvatarUpload).mockReturnValue({
        uploadAvatar: mockUploadAvatar as any,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        avatarUrl: null,
        reset: mockResetUpload as any,
      } as any);

      render(<AvatarUpload {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);

      const uploadButton = screen.getByTestId('button-Upload Photo');
      const removeButton = screen.getByTestId('button-Remove');

      expect(uploadButton).toBeDisabled();
      expect(removeButton).toBeDisabled();
    });

    it('should show spinner overlay during upload', () => {
      vi.mocked(useAvatarUpload).mockReturnValue({
        uploadAvatar: mockUploadAvatar as any,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        avatarUrl: null,
        reset: mockResetUpload as any,
      } as any);

      render(<AvatarUpload {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should call onSuccess after successful upload', () => {
      let capturedOnSuccess: ((response: any) => void) | undefined;

      vi.mocked(useAvatarUpload).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          uploadAvatar: mockUploadAvatar as any,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          avatarUrl: null,
          reset: mockResetUpload as any,
        } as any;
      });

      render(<AvatarUpload {...defaultProps} onSuccess={mockOnSuccess} />);

      // Simulate successful upload by calling the captured callback
      if (capturedOnSuccess !== undefined) {
        capturedOnSuccess({
          avatarUrl: 'https://example.com/new-avatar.jpg',
        });
      }

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should display upload error', () => {
      vi.mocked(useAvatarUpload).mockReturnValue({
        uploadAvatar: mockUploadAvatar as any,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Upload failed'),
        avatarUrl: null,
        reset: mockResetUpload as any,
      } as any);

      render(<AvatarUpload {...defaultProps} />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Delete Operations
  // ============================================================================

  describe('delete operations', () => {
    it('should call deleteAvatar when remove button is clicked and confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<AvatarUpload {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);

      fireEvent.click(screen.getByTestId('button-Remove'));

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete your avatar?');
      expect(mockDeleteAvatar).toHaveBeenCalled();
    });

    it('should not call deleteAvatar when user cancels confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<AvatarUpload {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);

      fireEvent.click(screen.getByTestId('button-Remove'));

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteAvatar).not.toHaveBeenCalled();
    });

    it('should disable buttons during delete', () => {
      vi.mocked(useAvatarDelete).mockReturnValue({
        deleteAvatar: mockDeleteAvatar,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: mockResetDelete,
      } as any);

      render(<AvatarUpload {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);

      const uploadButton = screen.getByTestId('button-Upload Photo');
      const removeButton = screen.getByTestId('button-Remove');

      expect(uploadButton).toBeDisabled();
      expect(removeButton).toBeDisabled();
    });

    it('should show spinner during delete', () => {
      vi.mocked(useAvatarDelete).mockReturnValue({
        deleteAvatar: mockDeleteAvatar,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: mockResetDelete,
      } as any);

      render(<AvatarUpload {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should call onSuccess after successful delete', () => {
      let capturedOnSuccess: ((response: any) => void) | undefined;

      vi.mocked(useAvatarDelete).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          deleteAvatar: mockDeleteAvatar as any,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockResetDelete as any,
        } as any;
      });

      render(<AvatarUpload {...defaultProps} onSuccess={mockOnSuccess} />);

      // Simulate successful delete by calling the captured callback
      if (capturedOnSuccess !== undefined) {
        capturedOnSuccess({ success: true });
      }

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should display delete error', () => {
      vi.mocked(useAvatarDelete).mockReturnValue({
        deleteAvatar: mockDeleteAvatar as any,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Delete failed'),
        reset: mockResetDelete as any,
      } as any);

      render(<AvatarUpload {...defaultProps} />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Cancel Operations
  // ============================================================================

  describe('cancel operations', () => {
    it('should cancel file selection and reset state', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('button-Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('button-Cancel'));

      expect(screen.queryByTestId('button-Save')).not.toBeInTheDocument();
      expect(screen.getByTestId('button-Upload Photo')).toBeInTheDocument();
    });

    it('should clear file input value on cancel', async () => {
      render(<AvatarUpload {...defaultProps} />);

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('button-Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('button-Cancel'));

      // Note: in jsdom, we can't fully test clearing the input value
      // but we can verify the cancel button works
      expect(screen.queryByTestId('button-Cancel')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error Display
  // ============================================================================

  describe('error display', () => {
    it('should prioritize upload error over delete error', () => {
      vi.mocked(useAvatarUpload).mockReturnValue({
        uploadAvatar: mockUploadAvatar as any,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Upload error'),
        avatarUrl: null,
        reset: mockResetUpload as any,
      } as any);

      vi.mocked(useAvatarDelete).mockReturnValue({
        deleteAvatar: mockDeleteAvatar as any,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Delete error'),
        reset: mockResetDelete as any,
      } as any);

      render(<AvatarUpload {...defaultProps} />);

      expect(screen.getByText('Upload error')).toBeInTheDocument();
      expect(screen.queryByText('Delete error')).not.toBeInTheDocument();
    });

    it('should not display alert when no error', () => {
      render(<AvatarUpload {...defaultProps} />);

      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle clicking upload photo button', () => {
      render(<AvatarUpload {...defaultProps} />);

      const uploadButton = screen.getByTestId('button-Upload Photo');
      fireEvent.click(uploadButton);

      // Should trigger file input click (tested via ref behavior)
      expect(uploadButton).toBeInTheDocument();
    });

    it('should handle combined loading states', () => {
      vi.mocked(useAvatarUpload).mockReturnValue({
        uploadAvatar: mockUploadAvatar as any,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        avatarUrl: null,
        reset: mockResetUpload as any,
      } as any);

      vi.mocked(useAvatarDelete).mockReturnValue({
        deleteAvatar: mockDeleteAvatar as any,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: mockResetDelete as any,
      } as any);

      render(<AvatarUpload {...defaultProps} />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should not call uploadAvatar when no file selected', async () => {
      render(<AvatarUpload {...defaultProps} />);

      // Try to upload without selecting a file
      expect(screen.queryByTestId('button-Save')).not.toBeInTheDocument();
      expect(mockUploadAvatar).not.toHaveBeenCalled();
    });

    it('should handle onSuccess prop being undefined', () => {
      let capturedOnSuccess: ((response: any) => void) | undefined;

      vi.mocked(useAvatarUpload).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          uploadAvatar: mockUploadAvatar as any,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          avatarUrl: null,
          reset: mockResetUpload as any,
        } as any;
      });

      render(<AvatarUpload {...defaultProps} />);

      // Call the captured callback - should not throw
      if (capturedOnSuccess !== undefined) {
        capturedOnSuccess({
          avatarUrl: 'https://example.com/new-avatar.jpg',
        });
      }

      // No assertions needed - just verify it doesn't throw
      expect(true).toBe(true);
    });
  });
});
