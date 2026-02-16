// main/apps/web/src/features/activities/pages/ActivityFeedPage.test.tsx
/**
 * ActivityFeedPage Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityFeedPage } from './ActivityFeedPage';

import type { ReactNode } from 'react';

// Mock the ActivityFeed component
vi.mock('../components/ActivityFeed', () => ({
  ActivityFeed: ({ limit }: { limit?: number }) => (
    <div data-testid="activity-feed" data-limit={limit}>
      Activity Feed Content
    </div>
  ),
}));

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  return {
    ...actual,
    Card: ({ children }: { children: ReactNode }) => <div data-testid="card">{children}</div>,
    Heading: ({ children, as }: { children: ReactNode; as?: string }) => {
      const Tag = (as ?? 'h1') as keyof HTMLElementTagNameMap;
      return <Tag>{children}</Tag>;
    },
    PageContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="page-container">{children}</div>
    ),
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };
});

describe('ActivityFeedPage', () => {
  it('should render page heading', () => {
    render(<ActivityFeedPage />);

    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<ActivityFeedPage />);

    expect(screen.getByText('A timeline of your recent actions and events.')).toBeInTheDocument();
  });

  it('should render ActivityFeed with limit of 50', () => {
    render(<ActivityFeedPage />);

    const feed = screen.getByTestId('activity-feed');
    expect(feed).toBeInTheDocument();
    expect(feed).toHaveAttribute('data-limit', '50');
  });

  it('should render inside PageContainer', () => {
    render(<ActivityFeedPage />);

    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render ActivityFeed inside a Card', () => {
    render(<ActivityFeedPage />);

    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Activity Feed Content');
  });
});
