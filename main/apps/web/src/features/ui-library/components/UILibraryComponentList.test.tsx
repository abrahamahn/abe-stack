// main/apps/web/src/features/ui-library/components/UILibraryComponentList.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock fn references so they are available when vi.mock factories execute
const { mockCloseButton, mockHeading, mockMenuItem, mockScrollArea, mockText } = vi.hoisted(() => ({
  mockCloseButton: vi.fn(),
  mockHeading: vi.fn(),
  mockMenuItem: vi.fn(),
  mockScrollArea: vi.fn(),
  mockText: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => ({
  ['CloseButton']: (props: { onClick: () => void }) => {
    mockCloseButton(props);
    return <button onClick={props.onClick}>Close</button>;
  },
  ['Heading']: (props: { children?: ReactNode }) => {
    mockHeading(props);
    return <h2>{props.children}</h2>;
  },
  ['MenuItem']: (props: {
    children?: ReactNode;
    onClick: () => void;
    'data-selected': boolean;
  }) => {
    mockMenuItem(props);
    return (
      <div onClick={props.onClick} data-selected={props['data-selected']}>
        {props.children}
      </div>
    );
  },
  ['ScrollArea']: (props: { children?: ReactNode }) => {
    mockScrollArea(props);
    return <div>{props.children}</div>;
  },
  ['Text']: (props: { children?: ReactNode }) => {
    mockText(props);
    return <span>{props.children}</span>;
  },
}));

import { UILibraryComponentList } from './UILibraryComponentList';

import type { ComponentDemo } from '@ui-library/types';
import type { ReactNode } from 'react';

describe('UILibraryComponentList', () => {
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
    render(<UILibraryComponentList {...defaultProps} />);
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Input')).toBeInTheDocument();
  });

  it('should show variant counts', () => {
    render(<UILibraryComponentList {...defaultProps} />);
    expect(screen.getByText('2 variants')).toBeInTheDocument();
    expect(screen.getByText('1 variant')).toBeInTheDocument();
  });

  it('should call onSelectComponent when component clicked', () => {
    render(<UILibraryComponentList {...defaultProps} />);
    fireEvent.click(screen.getByText('Button'));
    expect(defaultProps.onSelectComponent).toHaveBeenCalledWith(mockComponents[0]);
  });

  it('should call onClose when close button clicked', () => {
    render(<UILibraryComponentList {...defaultProps} />);
    fireEvent.click(screen.getByText('Close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should mark selected component', () => {
    render(
      <UILibraryComponentList {...defaultProps} selectedComponent={mockComponents[0] ?? null} />,
    );
    const buttons = screen.getAllByText('Button');
    expect(buttons[0]?.parentElement).toHaveAttribute('data-selected', 'true');
  });
});
