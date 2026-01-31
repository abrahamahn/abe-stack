// client/ui/src/elements/EnvironmentBadge.test.tsx
// client/ui/src/components/__tests__/EnvironmentBadge.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { EnvironmentBadge } from './EnvironmentBadge';

describe('EnvironmentBadge', () => {
  describe('rendering', () => {
    it('renders development badge with short label by default', () => {
      render(<EnvironmentBadge environment="development" />);

      expect(screen.getByText('DEV')).toBeInTheDocument();
    });

    it('renders production badge with short label by default', () => {
      render(<EnvironmentBadge environment="production" />);

      expect(screen.getByText('PROD')).toBeInTheDocument();
    });

    it('renders staging badge with short label by default', () => {
      render(<EnvironmentBadge environment="staging" />);

      expect(screen.getByText('STG')).toBeInTheDocument();
    });

    it('renders test badge with short label by default', () => {
      render(<EnvironmentBadge environment="test" />);

      expect(screen.getByText('TEST')).toBeInTheDocument();
    });
  });

  describe('short vs full labels', () => {
    it('renders full label when short is false', () => {
      render(<EnvironmentBadge environment="development" short={false} />);

      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.queryByText('DEV')).not.toBeInTheDocument();
    });

    it('renders full production label when short is false', () => {
      render(<EnvironmentBadge environment="production" short={false} />);

      expect(screen.getByText('Production')).toBeInTheDocument();
    });

    it('renders full staging label when short is false', () => {
      render(<EnvironmentBadge environment="staging" short={false} />);

      expect(screen.getByText('Staging')).toBeInTheDocument();
    });

    it('renders full test label when short is false', () => {
      render(<EnvironmentBadge environment="test" short={false} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('renders short label when short is explicitly true', () => {
      render(<EnvironmentBadge environment="development" short={true} />);

      expect(screen.getByText('DEV')).toBeInTheDocument();
    });
  });

  describe('styling and attributes', () => {
    it('applies environment-badge class', () => {
      render(<EnvironmentBadge environment="development" data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('environment-badge');
    });

    it('sets data-environment attribute', () => {
      render(<EnvironmentBadge environment="production" data-testid="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-environment', 'production');
    });

    it('applies custom className', () => {
      render(
        <EnvironmentBadge environment="staging" className="custom-class" data-testid="badge" />,
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('environment-badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('passes through additional props', () => {
      render(
        <EnvironmentBadge environment="test" data-testid="badge" aria-label="Environment status" />,
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('aria-label', 'Environment status');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to span element', () => {
      const ref = createRef<HTMLSpanElement>();
      render(<EnvironmentBadge environment="development" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current?.textContent).toBe('DEV');
    });
  });

  describe('displayName', () => {
    it('has correct displayName', () => {
      expect(EnvironmentBadge.displayName).toBe('EnvironmentBadge');
    });
  });
});
