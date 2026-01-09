// apps/web/src/features/demo/components/__tests__/DemoPreviewArea.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoPreviewArea } from '../DemoPreviewArea';

import type { ComponentDemo } from '@demo/types';

// Mock clipboard API
const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
Object.assign(navigator, { clipboard: mockClipboard });

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>): React.ReactElement => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Heading: ({
    children,
    as: Tag = 'h2',
  }: {
    children: React.ReactNode;
    as?: string;
  }): React.ReactElement => <>{React.createElement(Tag, null, children)}</>,
  ScrollArea: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="scroll-area">{children}</div>
  ),
  Text: ({ children, ...props }: React.ComponentProps<'span'>): React.ReactElement => (
    <span {...props}>{children}</span>
  ),
}));

describe('DemoPreviewArea', () => {
  const mockComponent: ComponentDemo = {
    id: 'button',
    name: 'Button',
    category: 'elements',
    description: 'A clickable button component',
    variants: [
      {
        name: 'Primary',
        description: 'Primary button style',
        code: '<Button variant="primary">Click me</Button>',
        render: () => React.createElement('button', null, 'Click me'),
      },
      {
        name: 'Secondary',
        description: 'Secondary button style',
        code: '<Button variant="secondary">Click</Button>',
        render: () => React.createElement('button', null, 'Click'),
      },
    ],
  };

  const defaultProps = {
    selectedComponent: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows placeholder when no component is selected', () => {
    render(<DemoPreviewArea {...defaultProps} />);
    expect(screen.getByText(/select a component from the left sidebar/i)).toBeInTheDocument();
  });

  it('shows component name when selected', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);
    expect(screen.getByRole('heading', { name: 'Button' })).toBeInTheDocument();
  });

  it('shows component description when selected', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);
    expect(screen.getByText('A clickable button component')).toBeInTheDocument();
  });

  it('renders all variants', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secondary' })).toBeInTheDocument();
  });

  it('shows variant descriptions', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByText('Primary button style')).toBeInTheDocument();
    expect(screen.getByText('Secondary button style')).toBeInTheDocument();
  });

  it('renders variant components', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('has copy button for each variant', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);

    const copyButtons = screen.getAllByTitle(/copy code/i);
    expect(copyButtons).toHaveLength(2);
  });

  it('copies code to clipboard when copy button is clicked', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);

    const copyButtons = screen.getAllByTitle(/copy code/i);
    const firstButton = copyButtons[0];
    if (firstButton) fireEvent.click(firstButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      '<Button variant="primary">Click me</Button>',
    );
  });

  it('shows code in details element', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);

    const viewCodeSummaries = screen.getAllByText('View Code');
    expect(viewCodeSummaries).toHaveLength(2);
  });

  it('displays the actual code', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByText('<Button variant="primary">Click me</Button>')).toBeInTheDocument();
    expect(screen.getByText('<Button variant="secondary">Click</Button>')).toBeInTheDocument();
  });

  it('uses CSS classes for responsive grid', () => {
    const { container } = render(<DemoPreviewArea selectedComponent={mockComponent} />);

    const grid = container.querySelector('.grid-auto');
    expect(grid).toBeInTheDocument();
  });

  it('uses ScrollArea for scrollable content', () => {
    render(<DemoPreviewArea selectedComponent={mockComponent} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });
});
