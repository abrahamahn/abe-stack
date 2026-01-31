// shared/ui/src/elements/FileInput.test.tsx
/**
 * Tests for FileInput component.
 *
 * Tests styled file input with label, description, and error states.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FileInput } from './FileInput';

describe('FileInput', () => {
  describe('rendering', () => {
    it('should render as a file input element', () => {
      render(<FileInput data-testid="file-input" />);

      const input = screen.getByTestId('file-input');
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('type', 'file');
    });

    it('should apply input and file-input classes', () => {
      render(<FileInput data-testid="file-input" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveClass('input');
      expect(input).toHaveClass('file-input');
    });

    it('should merge custom className with base classes', () => {
      render(<FileInput data-testid="file-input" className="custom-class" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveClass('input', 'file-input', 'custom-class');
    });

    it('should handle empty className', () => {
      render(<FileInput data-testid="file-input" className="" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveClass('input', 'file-input');
    });

    it('should default to type file', () => {
      render(<FileInput data-testid="file-input" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('type', 'file');
    });
  });

  describe('file acceptance', () => {
    it('should accept specific file types', () => {
      render(<FileInput data-testid="file-input" accept="image/*" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('accept', 'image/*');
    });

    it('should accept multiple file extensions', () => {
      render(<FileInput data-testid="file-input" accept=".jpg,.png,.gif" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('accept', '.jpg,.png,.gif');
    });

    it('should accept all files by default', () => {
      render(<FileInput data-testid="file-input" />);

      const input = screen.getByTestId('file-input');
      expect(input).not.toHaveAttribute('accept');
    });
  });

  describe('multiple files', () => {
    it('should support multiple file selection', () => {
      render(<FileInput data-testid="file-input" multiple />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('multiple');
    });

    it('should support single file selection by default', () => {
      render(<FileInput data-testid="file-input" />);

      const input = screen.getByTestId('file-input');
      expect(input).not.toHaveAttribute('multiple');
    });
  });

  describe('interactions', () => {
    it('should call onChange when file is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

      render(<FileInput data-testid="file-input" onChange={onChange} />);

      const input = screen.getByTestId<HTMLInputElement>('file-input');
      await user.upload(input, file);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(input.files?.[0]).toBe(file);
      expect(input.files?.length).toBe(1);
    });

    it('should call onChange with multiple files', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const file1 = new File(['hello'], 'hello.txt', { type: 'text/plain' });
      const file2 = new File(['world'], 'world.txt', { type: 'text/plain' });

      render(<FileInput data-testid="file-input" onChange={onChange} multiple />);

      const input = screen.getByTestId<HTMLInputElement>('file-input');
      await user.upload(input, [file1, file2]);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(input.files?.length).toBe(2);
      expect(input.files?.[0]).toBe(file1);
      expect(input.files?.[1]).toBe(file2);
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

      render(<FileInput data-testid="file-input" onChange={onChange} disabled />);

      const input = screen.getByTestId<HTMLInputElement>('file-input');
      await user.upload(input, file);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should support disabled state', () => {
      render(<FileInput data-testid="file-input" disabled />);

      const input = screen.getByTestId('file-input');
      expect(input).toBeDisabled();
    });

    it('should support enabled state', () => {
      render(<FileInput data-testid="file-input" />);

      const input = screen.getByTestId('file-input');
      expect(input).toBeEnabled();
    });

    it('should support required state', () => {
      render(<FileInput data-testid="file-input" required />);

      const input = screen.getByTestId('file-input');
      expect(input).toBeRequired();
    });
  });

  describe('props passthrough', () => {
    it('should pass data attributes', () => {
      render(<FileInput data-testid="file-input" data-custom="value" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('data-custom', 'value');
    });

    it('should pass aria attributes', () => {
      render(<FileInput data-testid="file-input" aria-label="Upload file" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('aria-label', 'Upload file');
    });

    it('should pass id prop', () => {
      render(<FileInput data-testid="file-input" id="file-upload" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('id', 'file-upload');
    });

    it('should pass name prop', () => {
      render(<FileInput data-testid="file-input" name="avatar" />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('name', 'avatar');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = createRef<HTMLInputElement>();

      render(<FileInput ref={ref} data-testid="file-input" />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveAttribute('type', 'file');
    });

    it('should allow ref to access input methods', () => {
      const ref = createRef<HTMLInputElement>();

      render(<FileInput ref={ref} data-testid="file-input" />);

      expect(() => ref.current?.focus()).toBeDefined();
      expect(() => ref.current?.click()).toBeDefined();
    });
  });
});

describe('FileInput.Field', () => {
  describe('rendering', () => {
    it('should render with label', () => {
      render(<FileInput.Field label="Upload Avatar" />);

      expect(screen.getByText('Upload Avatar')).toBeInTheDocument();
      expect(screen.getByLabelText('Upload Avatar')).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(<FileInput.Field data-testid="field" />);

      const container = screen.getByTestId('field').parentElement;
      expect(container?.querySelector('label')).not.toBeInTheDocument();
    });

    it('should render with description', () => {
      render(<FileInput.Field label="Upload" description="Max file size: 5MB" />);

      expect(screen.getByText('Max file size: 5MB')).toBeInTheDocument();
    });

    it('should render with error', () => {
      render(<FileInput.Field label="Upload" error="File is too large" />);

      expect(screen.getByText('File is too large')).toBeInTheDocument();
    });

    it('should render error instead of description when both provided', () => {
      render(
        <FileInput.Field
          label="Upload"
          description="Max file size: 5MB"
          error="File is too large"
        />,
      );

      expect(screen.getByText('File is too large')).toBeInTheDocument();
      expect(screen.getByText('Max file size: 5MB')).toBeInTheDocument();
    });
  });

  describe('label behavior', () => {
    it('should associate label with input via htmlFor', () => {
      render(<FileInput.Field label="Upload Avatar" id="avatar-input" />);

      const label = screen.getByText('Upload Avatar');
      const input = screen.getByLabelText('Upload Avatar');

      expect(label).toHaveAttribute('for', 'avatar-input');
      expect(input).toHaveAttribute('id', 'avatar-input');
    });

    it('should generate unique id when not provided', () => {
      render(<FileInput.Field label="Upload" />);

      const input = screen.getByLabelText('Upload');
      const id = input.getAttribute('id');

      expect(id).toBeTruthy();
      expect(id).toMatch(/^file-input-/);
    });

    it('should visually hide label when hideLabel is true', () => {
      render(<FileInput.Field label="Upload Avatar" hideLabel />);

      const label = screen.getByText('Upload Avatar');
      expect(label).toHaveClass('visually-hidden');
    });

    it('should show label by default', () => {
      render(<FileInput.Field label="Upload Avatar" />);

      const label = screen.getByText('Upload Avatar');
      expect(label).not.toHaveClass('visually-hidden');
    });

    it('should keep label accessible when hidden', () => {
      render(<FileInput.Field label="Upload Avatar" hideLabel />);

      const input = screen.getByLabelText('Upload Avatar');
      expect(input).toBeInTheDocument();
    });
  });

  describe('description', () => {
    it('should link description to input via aria-describedby', () => {
      render(<FileInput.Field label="Upload" description="Max file size: 5MB" id="upload-input" />);

      const input = screen.getByLabelText('Upload');
      const description = screen.getByText('Max file size: 5MB');

      expect(input).toHaveAttribute('aria-describedby', 'upload-input-desc');
      expect(description).toHaveAttribute('id', 'upload-input-desc');
    });

    it('should have muted tone', () => {
      render(<FileInput.Field label="Upload" description="Max file size: 5MB" />);

      const description = screen.getByText('Max file size: 5MB');
      expect(description).toHaveClass('input-description');
    });

    it('should not render when description is empty string', () => {
      render(<FileInput.Field label="Upload" description="" />);

      const container = screen.getByLabelText('Upload').parentElement;
      expect(container?.querySelector('.input-description')).not.toBeInTheDocument();
    });
  });

  describe('error', () => {
    it('should link error to input via aria-describedby', () => {
      render(<FileInput.Field label="Upload" error="File is too large" id="upload-input" />);

      const input = screen.getByLabelText('Upload');
      const error = screen.getByText('File is too large');

      expect(input).toHaveAttribute('aria-describedby', 'upload-input-err');
      expect(error).toHaveAttribute('id', 'upload-input-err');
    });

    it('should set aria-invalid when error is present', () => {
      render(<FileInput.Field label="Upload" error="File is too large" />);

      const input = screen.getByLabelText('Upload');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not set aria-invalid when no error', () => {
      render(<FileInput.Field label="Upload" />);

      const input = screen.getByLabelText('Upload');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have danger tone', () => {
      render(<FileInput.Field label="Upload" error="File is too large" />);

      const error = screen.getByText('File is too large');
      expect(error).toHaveClass('input-error');
    });

    it('should not render when error is empty string', () => {
      render(<FileInput.Field label="Upload" error="" />);

      const container = screen.getByLabelText('Upload').parentElement;
      expect(container?.querySelector('.input-error')).not.toBeInTheDocument();
    });

    it('should prioritize error over description in aria-describedby', () => {
      render(
        <FileInput.Field
          label="Upload"
          description="Max file size: 5MB"
          error="File is too large"
          id="upload-input"
        />,
      );

      const input = screen.getByLabelText('Upload');
      expect(input).toHaveAttribute('aria-describedby', 'upload-input-err');
    });
  });

  describe('interactions', () => {
    it('should call onChange when file is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

      render(<FileInput.Field label="Upload" onChange={onChange} />);

      const input = screen.getByLabelText<HTMLInputElement>('Upload');
      await user.upload(input, file);

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should focus input when clicking label', async () => {
      const user = userEvent.setup();

      render(<FileInput.Field label="Upload Avatar" />);

      const label = screen.getByText('Upload Avatar');
      await user.click(label);

      const input = screen.getByLabelText('Upload Avatar');
      expect(input).toHaveFocus();
    });
  });

  describe('props passthrough', () => {
    it('should pass accept prop to input', () => {
      render(<FileInput.Field label="Upload" accept="image/*" />);

      const input = screen.getByLabelText('Upload');
      expect(input).toHaveAttribute('accept', 'image/*');
    });

    it('should pass multiple prop to input', () => {
      render(<FileInput.Field label="Upload" multiple />);

      const input = screen.getByLabelText('Upload');
      expect(input).toHaveAttribute('multiple');
    });

    it('should pass disabled prop to input', () => {
      render(<FileInput.Field label="Upload" disabled />);

      const input = screen.getByLabelText('Upload');
      expect(input).toBeDisabled();
    });

    it('should pass required prop to input', () => {
      render(<FileInput.Field label="Upload" required />);

      const input = screen.getByLabelText('Upload');
      expect(input).toBeRequired();
    });

    it('should pass className to input', () => {
      render(<FileInput.Field label="Upload" className="custom-class" />);

      const input = screen.getByLabelText('Upload');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = createRef<HTMLInputElement>();

      render(<FileInput.Field ref={ref} label="Upload" />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveAttribute('type', 'file');
    });
  });

  describe('accessibility', () => {
    it('should have proper label association', () => {
      render(<FileInput.Field label="Upload Avatar" />);

      const input = screen.getByLabelText('Upload Avatar');
      expect(input).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      render(<FileInput.Field label="Upload" />);

      await user.tab();
      const input = screen.getByLabelText('Upload');
      expect(input).toHaveFocus();
    });

    it('should link description for screen readers', () => {
      render(<FileInput.Field label="Upload" description="Max file size: 5MB" />);

      const input = screen.getByLabelText('Upload');
      const describedById = input.getAttribute('aria-describedby');

      expect(describedById).toBeTruthy();
      const description = document.getElementById(describedById as string);
      expect(description?.textContent).toBe('Max file size: 5MB');
    });

    it('should link error for screen readers', () => {
      render(<FileInput.Field label="Upload" error="File is too large" />);

      const input = screen.getByLabelText('Upload');
      const describedById = input.getAttribute('aria-describedby');

      expect(describedById).toBeTruthy();
      const error = document.getElementById(describedById as string);
      expect(error?.textContent).toBe('File is too large');
    });
  });

  describe('edge cases', () => {
    it('should handle null label', () => {
      render(<FileInput.Field label={null as unknown as string} data-testid="field" />);

      const input = screen.getByTestId('field');
      expect(input).toBeInTheDocument();
      expect(input.parentElement?.querySelector('label')).not.toBeInTheDocument();
    });

    it('should handle null description', () => {
      render(<FileInput.Field label="Upload" description={null as unknown as string} />);

      const input = screen.getByLabelText('Upload');
      expect(input.parentElement?.querySelector('.input-description')).not.toBeInTheDocument();
    });

    it('should handle null error', () => {
      render(<FileInput.Field label="Upload" error={null as unknown as string} />);

      const input = screen.getByLabelText('Upload');
      expect(input.parentElement?.querySelector('.input-error')).not.toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should generate unique ids for multiple instances', () => {
      render(
        <>
          <FileInput.Field label="Upload 1" />
          <FileInput.Field label="Upload 2" />
          <FileInput.Field label="Upload 3" />
        </>,
      );

      const input1 = screen.getByLabelText('Upload 1');
      const input2 = screen.getByLabelText('Upload 2');
      const input3 = screen.getByLabelText('Upload 3');

      const id1 = input1.getAttribute('id');
      const id2 = input2.getAttribute('id');
      const id3 = input3.getAttribute('id');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });
});
