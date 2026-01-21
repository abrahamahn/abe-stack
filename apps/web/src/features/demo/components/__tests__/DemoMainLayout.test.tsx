// apps/web/src/features/demo/components/__tests__/DemoMainLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DemoMainLayout } from '../DemoMainLayout';

import type { DemoMainLayoutProps } from '../DemoMainLayout';
import type { ComponentDemo, DemoPaneConfig } from '@demo/types';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Button: ({
    children,
    onClick,
    variant,
    ...props
  }: React.ComponentProps<'button'> & { variant?: string }): React.ReactElement => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  CloseButton: ({ onClick, ...props }: React.ComponentProps<'button'>): React.ReactElement => (
    <button onClick={onClick} data-testid="close-button" {...props}>
      X
    </button>
  ),
  Heading: ({
    children,
    as: Tag = 'h2',
  }: {
    children: React.ReactNode;
    as?: React.ElementType;
    size?: string;
  }): React.ReactElement => React.createElement(Tag, null, children),
  ResizablePanel: ({
    children,
    collapsed,
    onResize: _onResize,
    ...props
  }: {
    children: React.ReactNode;
    collapsed?: boolean;
    onResize?: (size: number) => void;
    'data-testid'?: string;
  }): React.ReactElement => (
    <div data-testid={props['data-testid']} data-collapsed={collapsed}>
      {children}
    </div>
  ),
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="panel-group">{children}</div>
  ),
  ScrollArea: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="scroll-area">{children}</div>
  ),
  Text: ({ children, ...props }: React.ComponentProps<'span'>): React.ReactElement => (
    <span {...props}>{children}</span>
  ),
}));

// Mock @demo/components
vi.mock('@demo/components', () => ({
  DemoDocContent: ({ component }: { component: ComponentDemo }): React.ReactElement => (
    <div data-testid="demo-doc-content">{component.name} documentation</div>
  ),
  DemoPreviewArea: ({
    selectedComponent,
  }: {
    selectedComponent: ComponentDemo | null;
  }): React.ReactElement => (
    <div data-testid="demo-preview-area">
      {selectedComponent ? selectedComponent.name : 'No component selected'}
    </div>
  ),
}));

describe('DemoMainLayout', () => {
  const mockPaneConfig: DemoPaneConfig = {
    top: { visible: true, size: 10 },
    left: { visible: true, size: 20 },
    right: { visible: true, size: 25 },
    bottom: { visible: true, size: 8 },
  };

  const mockComponents: ComponentDemo[] = [
    {
      id: 'button',
      name: 'Button',
      category: 'elements',
      description: 'A clickable button',
      variants: [
        { name: 'Primary', description: 'Primary button', code: '<Button />', render: () => null },
      ],
    },
    {
      id: 'text',
      name: 'Text',
      category: 'elements',
      description: 'Text component',
      variants: [
        { name: 'Default', description: 'Default text', code: '<Text />', render: () => null },
      ],
    },
  ];

  const defaultProps: DemoMainLayoutProps = {
    paneConfig: mockPaneConfig,
    togglePane: vi.fn(),
    handlePaneResize: vi.fn(),
    resetLayout: vi.fn(),
    categories: ['elements', 'components', 'layouts'],
    activeCategory: 'elements',
    setActiveCategory: vi.fn(),
    componentsInCategory: mockComponents,
    selectedComponent: null,
    setSelectedComponent: vi.fn(),
  };

  it('renders category buttons', () => {
    render(<DemoMainLayout {...defaultProps} />);

    // Category buttons show first letter only but have title for full name
    expect(screen.getByTitle('Elements')).toBeInTheDocument();
    expect(screen.getByTitle('Components')).toBeInTheDocument();
    expect(screen.getByTitle('Layouts')).toBeInTheDocument();
  });

  it('highlights active category', () => {
    render(<DemoMainLayout {...defaultProps} activeCategory="elements" />);

    const elementsBtn = screen.getByTitle('Elements');
    expect(elementsBtn).toHaveAttribute('data-variant', 'primary');

    const componentsBtn = screen.getByTitle('Components');
    expect(componentsBtn).toHaveAttribute('data-variant', 'secondary');
  });

  it('calls setActiveCategory when category button is clicked', () => {
    const setActiveCategory = vi.fn();
    render(<DemoMainLayout {...defaultProps} setActiveCategory={setActiveCategory} />);

    fireEvent.click(screen.getByTitle('Components'));
    expect(setActiveCategory).toHaveBeenCalledWith('components');
  });

  it('renders layout toggle buttons (T, L, R, B)', () => {
    render(<DemoMainLayout {...defaultProps} />);

    expect(screen.getByTitle('Toggle Top bar')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Left panel')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Right panel')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Bottom bar')).toBeInTheDocument();
  });

  it('calls togglePane when layout toggle is clicked', () => {
    const togglePane = vi.fn();
    render(<DemoMainLayout {...defaultProps} togglePane={togglePane} />);

    fireEvent.click(screen.getByTitle('Toggle Left panel'));
    expect(togglePane).toHaveBeenCalledWith('left');
  });

  it('renders reset layout button', () => {
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByTitle('Reset layout')).toBeInTheDocument();
  });

  it('calls resetLayout when reset button is clicked', () => {
    const resetLayout = vi.fn();
    render(<DemoMainLayout {...defaultProps} resetLayout={resetLayout} />);

    fireEvent.click(screen.getByTitle('Reset layout'));
    expect(resetLayout).toHaveBeenCalledTimes(1);
  });

  it('renders components in category', () => {
    render(<DemoMainLayout {...defaultProps} />);

    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('shows variant count for components', () => {
    render(<DemoMainLayout {...defaultProps} />);

    // Both components have 1 variant each, so there should be 2 elements with this text
    const variantCounts = screen.getAllByText('1 variant');
    expect(variantCounts).toHaveLength(2);
  });

  it('calls setSelectedComponent when component item is clicked', () => {
    const setSelectedComponent = vi.fn();
    render(<DemoMainLayout {...defaultProps} setSelectedComponent={setSelectedComponent} />);

    fireEvent.click(screen.getByText('Button'));
    expect(setSelectedComponent).toHaveBeenCalledWith(mockComponents[0]);
  });

  it('highlights selected component', () => {
    const firstComponent = mockComponents[0] ?? null;
    const { container } = render(
      <DemoMainLayout {...defaultProps} selectedComponent={firstComponent} />,
    );

    const selectedItem = container.querySelector('[data-selected="true"]');
    expect(selectedItem).toBeInTheDocument();
  });

  it('renders left panel with Components heading', () => {
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument();
  });

  it('renders right panel with Documentation heading', () => {
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
  });

  it('shows placeholder text when no component is selected', () => {
    render(<DemoMainLayout {...defaultProps} selectedComponent={null} />);
    expect(screen.getByText('Select a component to view documentation')).toBeInTheDocument();
  });

  it('shows DemoDocContent when component is selected', () => {
    const firstComponent = mockComponents[0] ?? null;
    render(<DemoMainLayout {...defaultProps} selectedComponent={firstComponent} />);
    expect(screen.getByTestId('demo-doc-content')).toBeInTheDocument();
    expect(screen.getByText('Button documentation')).toBeInTheDocument();
  });

  it('renders DemoPreviewArea', () => {
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByTestId('demo-preview-area')).toBeInTheDocument();
  });

  it('passes collapsed state to left panel', () => {
    const hiddenLeftConfig = {
      ...mockPaneConfig,
      left: { visible: false, size: 20 },
    };

    render(<DemoMainLayout {...defaultProps} paneConfig={hiddenLeftConfig} />);
    expect(screen.getByTestId('demo-left-panel')).toHaveAttribute('data-collapsed', 'true');
  });

  it('passes collapsed state to right panel', () => {
    const hiddenRightConfig = {
      ...mockPaneConfig,
      right: { visible: false, size: 25 },
    };

    render(<DemoMainLayout {...defaultProps} paneConfig={hiddenRightConfig} />);
    expect(screen.getByTestId('demo-right-panel')).toHaveAttribute('data-collapsed', 'true');
  });

  it('renders close buttons for left and right panels', () => {
    render(<DemoMainLayout {...defaultProps} />);

    const closeButtons = screen.getAllByTestId('close-button');
    expect(closeButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls togglePane when left panel close button is clicked', () => {
    const togglePane = vi.fn();
    render(<DemoMainLayout {...defaultProps} togglePane={togglePane} />);

    const closeButtons = screen.getAllByLabelText(/collapse.*panel/i);
    const leftPanelClose = closeButtons[0];
    if (leftPanelClose) fireEvent.click(leftPanelClose);

    expect(togglePane).toHaveBeenCalledWith('left');
  });

  it('has layout labels', () => {
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByText('LeftSidebarLayout')).toBeInTheDocument();
    expect(screen.getByText('RightSidebarLayout')).toBeInTheDocument();
  });
});
