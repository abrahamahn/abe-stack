// main/apps/web/src/features/ui-library/components/UILibraryPreviewArea.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock clipboard API
const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
Object.assign(navigator, { clipboard: mockClipboard });

// Hoist mock fn references so they are available when vi.mock factories execute
const { mockButton, mockHeading, mockScrollArea, mockText } = vi.hoisted(() => ({
  mockButton: vi.fn(),
  mockHeading: vi.fn(),
  mockScrollArea: vi.fn(),
  mockText: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => ({
  ['Button']: (props: ComponentProps<'button'>): ReactElement => {
    mockButton(props);
    const { children, onClick, ...rest } = props;
    return (
      <button onClick={onClick} {...rest}>
        {children}
      </button>
    ) as ReactElement;
  },
  ['Heading']: (props: { children: ReactNode; as?: string }): ReactElement => {
    mockHeading(props);
    const { children, as: tag = 'h2' } = props;
    return (<>{createElement(tag, null, children)}</>) as ReactElement;
  },
  ['ScrollArea']: (props: { children: ReactNode }): ReactElement => {
    mockScrollArea(props);
    return (<div data-testid="scroll-area">{props.children}</div>) as ReactElement;
  },
  ['Text']: (props: ComponentProps<'span'>): ReactElement => {
    mockText(props);
    const { children, ...rest } = props;
    return (<span {...rest}>{children}</span>) as ReactElement;
  },
}));

import { UILibraryPreviewArea } from './UILibraryPreviewArea';

import type { ComponentDemo } from '@ui-library/types';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

describe('UILibraryPreviewArea', () => {
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
        render: () => createElement('button', null, 'Click me'),
      },
      {
        name: 'Secondary',
        description: 'Secondary button style',
        code: '<Button variant="secondary">Click</Button>',
        render: () => createElement('button', null, 'Click'),
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
    render(<UILibraryPreviewArea {...defaultProps} />);
    expect(
      screen.getByText(/select a component from the left sidebar to view demos/i),
    ).toBeInTheDocument();
  });

  it('shows component name when selected', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);
    expect(screen.getByRole('heading', { name: 'Button' })).toBeInTheDocument();
  });

  it('shows component description when selected', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);
    expect(screen.getByText('A clickable button component')).toBeInTheDocument();
  });

  it('renders all variants', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secondary' })).toBeInTheDocument();
  });

  it('shows variant descriptions', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByText('Primary button style')).toBeInTheDocument();
    expect(screen.getByText('Secondary button style')).toBeInTheDocument();
  });

  it('renders variant components', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('has copy button for each variant', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    const copyButtons = screen.getAllByTitle(/copy code/i);
    expect(copyButtons).toHaveLength(2);
  });

  it('copies code to clipboard when copy button is clicked', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    const copyButtons = screen.getAllByTitle(/copy code/i);
    const firstButton = copyButtons[0];
    if (firstButton != null) fireEvent.click(firstButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      '<Button variant="primary">Click me</Button>',
    );
  });

  it('shows code in details element', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    const viewCodeSummaries = screen.getAllByText('View Code');
    expect(viewCodeSummaries).toHaveLength(2);
  });

  it('displays the actual code', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    expect(screen.getByText('<Button variant="primary">Click me</Button>')).toBeInTheDocument();
    expect(screen.getByText('<Button variant="secondary">Click</Button>')).toBeInTheDocument();
  });

  it('uses CSS classes for responsive grid', () => {
    const { container } = render(<UILibraryPreviewArea selectedComponent={mockComponent} />);

    const grid = container.querySelector('.grid-auto');
    expect(grid).toBeInTheDocument();
  });

  it('uses ScrollArea for scrollable content', () => {
    render(<UILibraryPreviewArea selectedComponent={mockComponent} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });
});
