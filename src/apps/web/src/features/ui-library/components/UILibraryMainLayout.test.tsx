// apps/web/src/features/ui-library/components/UILibraryMainLayout.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Hoist mock fn references so they are available when vi.mock factories execute
const {
  mockButton,
  mockCloseButton,
  mockHeading,
  mockMenuItem,
  mockResizablePanel,
  mockResizablePanelGroup,
  mockScrollArea,
  mockText,
  mockUILibraryDocContent,
  mockUILibraryPreviewArea,
} = vi.hoisted(() => ({
  mockButton: vi.fn(),
  mockCloseButton: vi.fn(),
  mockHeading: vi.fn(),
  mockMenuItem: vi.fn(),
  mockResizablePanel: vi.fn(),
  mockResizablePanelGroup: vi.fn(),
  mockScrollArea: vi.fn(),
  mockText: vi.fn(),
  mockUILibraryDocContent: vi.fn(),
  mockUILibraryPreviewArea: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => ({
  ['Button']: (props: { children?: ReactNode; onClick?: () => void; variant?: string }) => {
    mockButton(props);
    return (
      <button onClick={props.onClick} data-variant={props.variant}>
        {props.children}
      </button>
    );
  },
  ['CloseButton']: (props: { onClick: () => void }) => {
    mockCloseButton(props);
    return <button onClick={props.onClick}>X</button>;
  },
  ['Heading']: (props: { children?: ReactNode }) => {
    mockHeading(props);
    return <h2>{props.children}</h2>;
  },
  ['MenuItem']: (props: { children?: ReactNode; onClick: () => void }) => {
    mockMenuItem(props);
    return <div onClick={props.onClick}>{props.children}</div>;
  },
  ['ResizablePanel']: (props: { children?: ReactNode }) => {
    mockResizablePanel(props);
    return <div>{props.children}</div>;
  },
  ['ResizablePanelGroup']: (props: { children?: ReactNode }) => {
    mockResizablePanelGroup(props);
    return <div>{props.children}</div>;
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

vi.mock('@ui-library/components', () => ({
  ['UILibraryDocContent']: (props: Record<string, unknown>) => {
    mockUILibraryDocContent(props);
    return <div>Doc Content</div>;
  },
  ['UILibraryPreviewArea']: (props: Record<string, unknown>) => {
    mockUILibraryPreviewArea(props);
    return <div>Preview Area</div>;
  },
}));

import { UILibraryMainLayout } from './UILibraryMainLayout';

import type { UILibraryMainLayoutProps } from './UILibraryMainLayout';
import type { ComponentDemo, UILibraryPaneConfig } from '@ui-library/types';
import type { ReactNode } from 'react';

describe('UILibraryMainLayout', () => {
  const mockPaneConfig: UILibraryPaneConfig = {
    top: { visible: true, size: 10 },
    left: { visible: true, size: 20 },
    right: { visible: true, size: 30 },
    bottom: { visible: true, size: 15 },
  };

  const mockComponents: ComponentDemo[] = [
    {
      id: 'button',
      name: 'Button',
      category: 'elements',
      variants: [{ name: 'Primary' }],
    } as ComponentDemo,
  ];

  const defaultProps: UILibraryMainLayoutProps = {
    paneConfig: mockPaneConfig,
    togglePane: vi.fn(),
    handlePaneResize: vi.fn(),
    resetLayout: vi.fn(),
    categories: ['elements', 'components'],
    activeCategory: 'elements',
    setActiveCategory: vi.fn(),
    componentsInCategory: mockComponents,
    selectedComponent: null,
    setSelectedComponent: vi.fn(),
  };

  it('should render categories', () => {
    render(<UILibraryMainLayout {...defaultProps} />);
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('should call setActiveCategory when category clicked', () => {
    render(<UILibraryMainLayout {...defaultProps} />);
    fireEvent.click(screen.getByText('C'));
    expect(defaultProps.setActiveCategory).toHaveBeenCalledWith('components');
  });

  it('should render component list', () => {
    render(<UILibraryMainLayout {...defaultProps} />);
    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  it('should call resetLayout when reset clicked', () => {
    render(<UILibraryMainLayout {...defaultProps} />);
    fireEvent.click(screen.getByText('↺'));
    expect(defaultProps.resetLayout).toHaveBeenCalled();
  });

  it('should show preview area', () => {
    render(<UILibraryMainLayout {...defaultProps} />);
    expect(screen.getByText('Preview Area')).toBeInTheDocument();
  });
});
