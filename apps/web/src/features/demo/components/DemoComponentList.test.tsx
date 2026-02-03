// apps/web/src/features/demo/components/DemoComponentList.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DemoComponentList } from './DemoComponentList';

import type { ComponentDemo } from '@demo/types';

vi.mock('@abe-stack/ui', () => ({
  CloseButton: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Close</button>,
  Heading: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  MenuItem: ({
    children,
    onClick,
    'data-selected': selected,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    'data-selected': boolean;
  }) => (
    <div onClick={onClick} data-selected={selected}>
      {children}
    </div>
  ),
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('DemoComponentList', () => {
  const mockComponents: ComponentDemo[] = [
    {
      id: 'button',
      name: 'Button',
      category: 'Elements',
      variants: [{ name: 'Primary' }, { name: 'Secondary' }],
    },
    {
      id: 'input',
      name: 'Input',
      category: 'Elements',
      variants: [{ name: 'Default' }],
    },
  ] as any as ComponentDemo[];

  const defaultProps = {
    components: mockComponents,
    selectedComponent: null,
    onSelectComponent: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render all components', () => {
    render(<DemoComponentList {...defaultProps} />);
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Input')).toBeInTheDocument();
  });

  it('should show variant counts', () => {
    render(<DemoComponentList {...defaultProps} />);
    expect(screen.getByText('2 variants')).toBeInTheDocument();
    expect(screen.getByText('1 variant')).toBeInTheDocument();
  });

  it('should call onSelectComponent when component clicked', () => {
    render(<DemoComponentList {...defaultProps} />);
    fireEvent.click(screen.getByText('Button'));
    expect(defaultProps.onSelectComponent).toHaveBeenCalledWith(mockComponents[0]);
  });

  it('should call onClose when close button clicked', () => {
    render(<DemoComponentList {...defaultProps} />);
    fireEvent.click(screen.getByText('Close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should mark selected component', () => {
    render(<DemoComponentList {...defaultProps} selectedComponent={mockComponents[0] ?? null} />);
    const buttons = screen.getAllByText('Button');
    expect(buttons[0]?.parentElement).toHaveAttribute('data-selected', 'true');
  });
});
