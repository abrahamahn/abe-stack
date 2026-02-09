// src/client/ui/src/elements/VersionBadge.test.tsx
// client/ui/src/components/__tests__/VersionBadge.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { VersionBadge } from './VersionBadge';

describe('VersionBadge', () => {
  describe('rendering', () => {
    it('renders version with default prefix', () => {
      render(<VersionBadge version="1.2.3" />);

      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    it('renders version string correctly', () => {
      render(<VersionBadge version="2.0.0" data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge.textContent).toBe('v2.0.0');
    });

    it('handles semver versions', () => {
      render(<VersionBadge version="1.0.0-beta.1" />);

      expect(screen.getByText('v1.0.0-beta.1')).toBeInTheDocument();
    });
  });

  describe('prefix customization', () => {
    it('uses custom prefix', () => {
      render(<VersionBadge version="1.0.0" prefix="Version " />);

      expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    });

    it('allows empty prefix', () => {
      render(<VersionBadge version="3.0.0" prefix="" data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge.textContent).toBe('3.0.0');
    });

    it('uses default prefix v when not specified', () => {
      render(<VersionBadge version="1.2.3" data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge.textContent).toBe('v1.2.3');
    });
  });

  describe('styling and attributes', () => {
    it('applies version-badge class', () => {
      render(<VersionBadge version="1.0.0" data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('version-badge');
    });

    it('applies custom className', () => {
      render(<VersionBadge version="1.0.0" className="custom-class" data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('version-badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('passes through additional props', () => {
      render(<VersionBadge version="1.0.0" data-testid="badge" aria-label="Version info" />);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('aria-label', 'Version info');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to span element', () => {
      const ref = createRef<HTMLSpanElement>();
      render(<VersionBadge version="1.0.0" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current?.textContent).toBe('v1.0.0');
    });
  });

  describe('displayName', () => {
    it('has correct displayName', () => {
      expect(VersionBadge.displayName).toBe('VersionBadge');
    });
  });
});
