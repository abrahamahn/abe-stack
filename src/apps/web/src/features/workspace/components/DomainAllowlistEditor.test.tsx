// src/apps/web/src/features/workspace/components/DomainAllowlistEditor.test.tsx
/**
 * Domain Allowlist Editor Tests
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DomainAllowlistEditor } from './DomainAllowlistEditor';

// ============================================================================
// Setup
// ============================================================================

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ============================================================================
// Tests
// ============================================================================

describe('DomainAllowlistEditor', () => {
  let onChange: (domains: string[]) => void;

  beforeEach(() => {
    onChange = vi.fn<(domains: string[]) => void>();
  });

  it('should render with no domains', () => {
    render(<DomainAllowlistEditor domains={[]} onChange={onChange} />);
    expect(screen.getByLabelText(/allowed email domains/i)).toBeInTheDocument();
  });

  it('should display existing domains as badges', () => {
    render(
      <DomainAllowlistEditor domains={['example.com', 'acme.org']} onChange={onChange} />,
    );
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('acme.org')).toBeInTheDocument();
  });

  it('should add a valid domain on Enter key', () => {
    render(<DomainAllowlistEditor domains={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('example.com');
    fireEvent.change(input, { target: { value: 'newdomain.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['newdomain.com']);
  });

  it('should add a valid domain on Add button click', () => {
    render(<DomainAllowlistEditor domains={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('example.com');
    fireEvent.change(input, { target: { value: 'test.io' } });
    fireEvent.click(screen.getByText('Add'));

    expect(onChange).toHaveBeenCalledWith(['test.io']);
  });

  it('should strip @ prefix from domain input', () => {
    render(<DomainAllowlistEditor domains={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('example.com');
    fireEvent.change(input, { target: { value: '@company.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['company.com']);
  });

  it('should show error for invalid domain format', () => {
    render(<DomainAllowlistEditor domains={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('example.com');
    fireEvent.change(input, { target: { value: 'not-a-domain' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/invalid domain format/i)).toBeInTheDocument();
  });

  it('should show error for duplicate domain', () => {
    render(
      <DomainAllowlistEditor domains={['existing.com']} onChange={onChange} />,
    );

    const input = screen.getByPlaceholderText('example.com');
    fireEvent.change(input, { target: { value: 'existing.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/already added/i)).toBeInTheDocument();
  });

  it('should remove a domain when X button is clicked', () => {
    render(
      <DomainAllowlistEditor
        domains={['keep.com', 'remove.com']}
        onChange={onChange}
      />,
    );

    const removeButton = screen.getByLabelText('Remove remove.com');
    fireEvent.click(removeButton);

    expect(onChange).toHaveBeenCalledWith(['keep.com']);
  });

  it('should normalize domain to lowercase', () => {
    render(<DomainAllowlistEditor domains={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('example.com');
    fireEvent.change(input, { target: { value: 'MyDomain.COM' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['mydomain.com']);
  });

  it('should disable input and button when disabled prop is true', () => {
    render(
      <DomainAllowlistEditor domains={['test.com']} onChange={onChange} disabled />,
    );

    expect(screen.getByPlaceholderText('example.com')).toBeDisabled();
    expect(screen.queryByLabelText('Remove test.com')).not.toBeInTheDocument();
  });

  it('should clear error on input change', () => {
    render(<DomainAllowlistEditor domains={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('example.com');
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText(/invalid domain format/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'good.com' } });
    expect(screen.queryByText(/invalid domain format/i)).not.toBeInTheDocument();
  });
});
