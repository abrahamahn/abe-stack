// apps/web/src/features/demo/components/__tests__/DemoComponentList.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoComponentList } from '../DemoComponentList';

import type { ComponentDemo } from '@demo/types';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  CloseButton: ({ onClick, ...props }: React.ComponentProps<'button'>): React.ReactElement => (
    <button onClick={onClick} {...props}>
      ✕
    </button>
  ),
  Heading: ({ children }: { children: React.ReactNode }): React.ReactElement => <h2>{children}</h2>,
  ScrollArea: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="scroll-area">{children}</div>
  ),
  Text: ({ children, ...props }: React.ComponentProps<'span'>): React.ReactElement => (
    <span {...props}>{children}</span>
  ),
}));

describe('DemoComponentList', () => {
  const mockComponents: ComponentDemo[] = [
    {
      id: 'button',
      name: 'Button',
      category: 'elements',
      description: 'A clickable button',
      variants: [
        { name: 'Primary', description: 'Primary style', code: '<Button />', render: () => null },
        {
          name: 'Secondary',
          description: 'Secondary style',
          code: '<Button variant="secondary" />',
          render: () => null,
        },
      ],
    },
    {
      id: 'input',
      name: 'Input',
      category: 'elements',
      description: 'Text input field',
      variants: [
        { name: 'Default', description: 'Default style', code: '<Input />', render: () => null },
      ],
    },
  ];

  const defaultProps = {
    components: mockComponents,
    selectedComponent: null,
    onSelectComponent: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Components heading', () => {
    render(<DemoComponentList {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<DemoComponentList {...defaultProps} />);
    expect(screen.getByRole('button', { name: /collapse left panel/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<DemoComponentList {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /collapse left panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders all components in the list', () => {
    render(<DemoComponentList {...defaultProps} />);

    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Input')).toBeInTheDocument();
  });

  it('shows variant count for each component', () => {
    render(<DemoComponentList {...defaultProps} />);

    expect(screen.getByText('2 variants')).toBeInTheDocument();
    expect(screen.getByText('1 variant')).toBeInTheDocument();
  });

  it('calls onSelectComponent when a component is clicked', () => {
    const onSelectComponent = vi.fn();
    render(<DemoComponentList {...defaultProps} onSelectComponent={onSelectComponent} />);

    fireEvent.click(screen.getByText('Button'));
    expect(onSelectComponent).toHaveBeenCalledWith(mockComponents[0]);
  });

  it('marks selected component with data-selected attribute', () => {
    const firstComponent = mockComponents[0] ?? null;
    const { container } = render(
      <DemoComponentList {...defaultProps} selectedComponent={firstComponent} />,
    );

    const selectedItem = container.querySelector('.menu-item[data-selected="true"]');
    expect(selectedItem).toBeInTheDocument();
  });

  it('does not mark unselected components', () => {
    const firstComponent = mockComponents[0] ?? null;
    const { container } = render(
      <DemoComponentList {...defaultProps} selectedComponent={firstComponent} />,
    );

    const menuItems = container.querySelectorAll('.menu-item');
    const inputItem = menuItems[1];
    expect(inputItem).toHaveAttribute('data-selected', 'false');
  });

  it('uses ScrollArea for scrollable content', () => {
    render(<DemoComponentList {...defaultProps} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('uses CSS classes for styling', () => {
    const { container } = render(<DemoComponentList {...defaultProps} />);
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('panel');
    expect(panel.className).toContain('border-r');
  });
});
