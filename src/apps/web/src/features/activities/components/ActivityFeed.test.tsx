// src/apps/web/src/features/activities/components/ActivityFeed.test.tsx
/**
 * ActivityFeed Component Tests
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useActivities } from '../hooks';

import { ActivityFeed } from './ActivityFeed';

import type { ReactNode } from 'react';

// Mock hooks
vi.mock('../hooks', () => ({
  useActivities: vi.fn(),
}));

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  return {
    ...actual,
    Alert: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <div data-testid="alert" data-tone={tone}>
        {children}
      </div>
    ),
    Badge: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <span data-testid="badge" data-tone={tone}>
        {children}
      </span>
    ),
    Skeleton: ({ className }: { className?: string }) => (
      <div data-testid="skeleton" className={className} />
    ),
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };
});

const mockActivities = [
  {
    id: 'act-1',
    tenantId: null,
    actorId: 'user-1',
    actorType: 'user' as const,
    action: 'created',
    resourceType: 'project',
    resourceId: 'proj-12345678',
    description: 'Created a new project',
    metadata: {},
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'act-2',
    tenantId: null,
    actorId: null,
    actorType: 'system' as const,
    action: 'backup',
    resourceType: 'database',
    resourceId: 'db-1',
    description: null,
    metadata: {},
    ipAddress: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
];

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should render skeletons when loading', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ActivityFeed />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('should render error alert', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: [],
        isLoading: false,
        isError: true,
        error: new Error('Unauthorized'),
        refetch: vi.fn(),
      });

      render(<ActivityFeed />);

      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ActivityFeed />);

      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  describe('activity items', () => {
    it('should render activity action and resource type', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ActivityFeed />);

      expect(screen.getByText('created')).toBeInTheDocument();
      expect(screen.getByText('backup')).toBeInTheDocument();
    });

    it('should render actor type badges', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ActivityFeed />);

      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('system')).toBeInTheDocument();
    });

    it('should render description when present', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ActivityFeed />);

      expect(screen.getByText('Created a new project')).toBeInTheDocument();
    });

    it('should render relative time', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ActivityFeed />);

      expect(screen.getByText('1h ago')).toBeInTheDocument();
      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });

    it('should pass limit to hook', () => {
      vi.mocked(useActivities).mockReturnValue({
        activities: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ActivityFeed limit={5} />);

      expect(useActivities).toHaveBeenCalledWith({ limit: 5 });
    });
  });
});
