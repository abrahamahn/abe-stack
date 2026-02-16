// main/apps/web/src/features/home/components/HomeDocViewer.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeDocViewer } from './HomeDocViewer';

import type { HomeDocViewerProps } from './HomeDocViewer';
import type { ElementType, ReactElement, ReactNode } from 'react';

vi.mock('@abe-stack/react/hooks', () => {
  const mockUseDelayedFlag = (value: boolean): boolean => value;

  return {
    useDelayedFlag: mockUseDelayedFlag,
  };
});

vi.mock('@abe-stack/ui', () => {
  const mockHeading = ({
    children,
    as: tag = 'h2',
  }: {
    children: ReactNode;
    as?: ElementType;
    size?: string;
  }): ReactElement => {
    const Tag = tag;
    return <Tag>{children}</Tag>;
  };

  const mockMarkdown = ({
    children,
    className,
  }: {
    children: string;
    className?: string;
  }): ReactElement => <div className={className}>{children}</div>;

  const mockSkeleton = ({ className }: { className?: string }): ReactElement => (
    <div className={className} data-testid="skeleton" />
  );

  const mockText = ({
    children,
  }: {
    children: ReactNode;
    tone?: string;
    className?: string;
  }): ReactElement => <span>{children}</span>;

  return {
    Heading: mockHeading,
    Markdown: mockMarkdown,
    Skeleton: mockSkeleton,
    Text: mockText,
  };
});

describe('HomeDocViewer', () => {
  it('renders welcome message when no doc is selected', () => {
    const props: HomeDocViewerProps = {
      selectedDoc: null,
      content: null,
      isLoading: false,
    };
    render(<HomeDocViewer {...props} />);
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByText(/select a document/i)).toBeInTheDocument();
  });

  it('renders loading skeletons when loading', () => {
    const props: HomeDocViewerProps = {
      selectedDoc: 'readme',
      content: null,
      isLoading: true,
    };
    render(<HomeDocViewer {...props} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders markdown content when loaded', () => {
    const props: HomeDocViewerProps = {
      selectedDoc: 'readme',
      content: '# Hello World',
      isLoading: false,
    };
    render(<HomeDocViewer {...props} />);
    expect(screen.getByText('# Hello World')).toBeInTheDocument();
  });

  it('renders content without category breadcrumb', () => {
    const props: HomeDocViewerProps = {
      selectedDoc: 'readme',
      content: '# Hello',
      isLoading: false,
    };
    render(<HomeDocViewer {...props} />);
    expect(screen.getByText('# Hello')).toBeInTheDocument();
    expect(screen.queryByText('root / README')).not.toBeInTheDocument();
  });

  it('renders markdown-content class on the markdown container', () => {
    const props: HomeDocViewerProps = {
      selectedDoc: 'readme',
      content: '# Hello',
      isLoading: false,
    };
    const { container } = render(<HomeDocViewer {...props} />);
    expect(container.querySelector('.markdown-content')).toBeInTheDocument();
  });

  it('renders empty markdown when content is null but not loading', () => {
    const props: HomeDocViewerProps = {
      selectedDoc: 'readme',
      content: null,
      isLoading: false,
    };
    const { container } = render(<HomeDocViewer {...props} />);
    // Markdown component receives '' when content is null
    expect(container.querySelector('.markdown-content')).toBeInTheDocument();
  });
});
