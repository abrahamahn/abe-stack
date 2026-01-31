// apps/web/src/features/admin/pages/JobMonitorPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobMonitorPage } from './JobMonitorPage';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  PageContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  ),
  SidePeek: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="side-peek">{children}</div> : null,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

// Mock hooks
vi.mock('../hooks', () => ({
  useQueueStats: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useJobsList: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    filter: { status: undefined },
    setStatus: vi.fn(),
    setPage: vi.fn(),
  }),
  useJobDetails: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useJobActions: () => ({
    retryJob: vi.fn(),
    cancelJob: vi.fn(),
  }),
}));

// Mock components
vi.mock('../components', () => ({
  JobDetailsPanel: () => <div data-testid="job-details-panel">Job Details Panel</div>,
  JobsTable: () => <div data-testid="jobs-table">Jobs Table</div>,
  QueueStatsCard: () => <div data-testid="queue-stats-card">Queue Stats Card</div>,
}));

describe('JobMonitorPage', () => {
  it('should render the page container', () => {
    render(<JobMonitorPage />);
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render the heading', () => {
    render(<JobMonitorPage />);
    expect(screen.getByText('Job Monitor')).toBeInTheDocument();
  });

  it('should render the queue stats card', () => {
    render(<JobMonitorPage />);
    expect(screen.getByTestId('queue-stats-card')).toBeInTheDocument();
  });

  it('should render the jobs table', () => {
    render(<JobMonitorPage />);
    expect(screen.getByTestId('jobs-table')).toBeInTheDocument();
  });
});
