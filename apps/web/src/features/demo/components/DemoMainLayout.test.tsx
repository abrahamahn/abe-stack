// apps/web/src/features/demo/components/DemoMainLayout.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DemoMainLayout } from './DemoMainLayout';

import type { DemoMainLayoutProps } from './DemoMainLayout';
import type { ComponentDemo, DemoPaneConfig } from '@demo/types';

vi.mock('@abe-stack/ui', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
  CloseButton: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>X</button>,
  Heading: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  MenuItem: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@demo/components', () => ({
  DemoDocContent: () => <div>Doc Content</div>,
  DemoPreviewArea: () => <div>Preview Area</div>,
}));

describe('DemoMainLayout', () => {
  const mockPaneConfig: DemoPaneConfig = {
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

  const defaultProps: DemoMainLayoutProps = {
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
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('should call setActiveCategory when category clicked', () => {
    render(<DemoMainLayout {...defaultProps} />);
    fireEvent.click(screen.getByText('C'));
    expect(defaultProps.setActiveCategory).toHaveBeenCalledWith('components');
  });

  it('should render component list', () => {
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  it('should call resetLayout when reset clicked', () => {
    render(<DemoMainLayout {...defaultProps} />);
    fireEvent.click(screen.getByText('↺'));
    expect(defaultProps.resetLayout).toHaveBeenCalled();
  });

  it('should show preview area', () => {
    render(<DemoMainLayout {...defaultProps} />);
    expect(screen.getByText('Preview Area')).toBeInTheDocument();
  });
});
