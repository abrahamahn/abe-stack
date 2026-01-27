// apps/web/src/features/admin/components/JobStatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JobStatusBadge } from './JobStatusBadge';

import type { JobStatus } from '@abe-stack/core';

describe('JobStatusBadge', () => {
  describe('rendering different statuses', () => {
    it('should render pending status with info tone', () => {
      render(<JobStatusBadge status="pending" />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render processing status with warning tone', () => {
      render(<JobStatusBadge status="processing" />);

      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should render completed status with success tone', () => {
      render(<JobStatusBadge status="completed" />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render failed status with danger tone', () => {
      render(<JobStatusBadge status="failed" />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should render dead_letter status with danger tone', () => {
      render(<JobStatusBadge status="dead_letter" />);

      expect(screen.getByText('Dead Letter')).toBeInTheDocument();
    });

    it('should render cancelled status with warning tone', () => {
      render(<JobStatusBadge status="cancelled" />);

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('status configuration', () => {
    const statusTests: Array<{ status: JobStatus; expectedLabel: string }> = [
      { status: 'pending', expectedLabel: 'Pending' },
      { status: 'processing', expectedLabel: 'Processing' },
      { status: 'completed', expectedLabel: 'Completed' },
      { status: 'failed', expectedLabel: 'Failed' },
      { status: 'dead_letter', expectedLabel: 'Dead Letter' },
      { status: 'cancelled', expectedLabel: 'Cancelled' },
    ];

    it.each(statusTests)('should display correct label for $status', ({ status, expectedLabel }) => {
      render(<JobStatusBadge status={status} />);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('badge component integration', () => {
    it('should render Badge component', () => {
      const { container } = render(<JobStatusBadge status="completed" />);

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
