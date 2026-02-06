// apps/web/src/features/admin/pages/SecurityEventDetailPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SecurityEventDetailPage } from './SecurityEventDetailPage';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => {
  const button = ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  );
  const heading = ({
    children,
    as,
    size,
  }: {
    children: React.ReactNode;
    as?: string;
    size?: string;
  }) => {
    const Tag = (as ?? 'h1') as React.ElementType;
    return <Tag data-size={size}>{children}</Tag>;
  };
  const pageContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  );
  const text = ({
    children,
    tone,
    size,
  }: {
    children: React.ReactNode;
    tone?: string;
    size?: string;
  }) => (
    <span data-tone={tone} data-size={size}>
      {children}
    </span>
  );

  return {
    Button: button,
    Heading: heading,
    PageContainer: pageContainer,
    Text: text,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'test-event-id' }),
  };
});

// Mock hooks
vi.mock('../hooks', () => ({
  useSecurityEvent: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

// Mock components
vi.mock('../components', () => {
  const securityEventCard = ({ event, isLoading }: { event?: unknown; isLoading?: boolean }) => (
    <div data-testid="security-event-card" data-loading={isLoading}>
      {event !== undefined ? 'Event loaded' : 'No event'}
    </div>
  );

  return {
    SecurityEventCard: securityEventCard,
  };
});

describe('SecurityEventDetailPage', () => {
  it('should render the page container', () => {
    render(<SecurityEventDetailPage />);
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render the heading', () => {
    render(<SecurityEventDetailPage />);
    expect(screen.getByText('Security Event')).toBeInTheDocument();
  });

  it('should render the back button', () => {
    render(<SecurityEventDetailPage />);
    expect(screen.getByText('Back to Events')).toBeInTheDocument();
  });

  it('should render the security event card', () => {
    render(<SecurityEventDetailPage />);
    expect(screen.getByTestId('security-event-card')).toBeInTheDocument();
  });
});
