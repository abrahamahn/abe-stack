// apps/web/src/features/demo/components/__tests__/DemoBottomBar.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DemoBottomBar } from '../DemoBottomBar';

import type { DemoBottomBarProps } from '../DemoBottomBar';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>): React.ReactElement => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  EnvironmentBadge: ({ environment }: { environment: string }): React.ReactElement => (
    <span data-testid="environment-badge">{environment}</span>
  ),
  Kbd: ({ children }: { children: React.ReactNode }): React.ReactElement => <kbd>{children}</kbd>,
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
  Text: ({ children, ...props }: React.ComponentProps<'span'>): React.ReactElement => (
    <span {...props}>{children}</span>
  ),
  VersionBadge: ({ version }: { version: string }): React.ReactElement => (
    <span data-testid="version-badge">{version}</span>
  ),
}));

// Mock @config
vi.mock('@config', () => ({
  clientConfig: {
    uiVersion: '1.0.0',
    isDev: true,
  },
}));

// Mock @demo/hooks for KEYBOARD_SHORTCUTS
vi.mock('@demo/hooks', () => ({
  KEYBOARD_SHORTCUTS: [
    { key: 'L', description: 'Toggle left panel' },
    { key: 'R', description: 'Toggle right panel' },
  ],
}));

describe('DemoBottomBar', () => {
  const defaultProps: DemoBottomBarProps = {
    size: 10,
    visible: true,
    onResize: vi.fn(),
    totalComponents: 42,
    cycleTheme: vi.fn(),
    getThemeIcon: () => '☀️',
    getThemeLabel: () => 'Light',
  };

  it('renders the resizable panel with correct data-testid', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByTestId('demo-bottom-panel')).toBeInTheDocument();
  });

  it('shows version badge with correct version', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByTestId('version-badge')).toHaveTextContent('1.0.0');
  });

  it('shows environment badge as development when isDev is true', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByTestId('environment-badge')).toHaveTextContent('development');
  });

  it('displays total components count', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByText('42 components')).toBeInTheDocument();
  });

  it('renders keyboard shortcuts', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('Toggle left panel')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('Toggle right panel')).toBeInTheDocument();
  });

  it('renders theme toggle button with correct icon and label', () => {
    render(<DemoBottomBar {...defaultProps} />);
    const themeButton = screen.getByRole('button', { name: /theme: light/i });
    expect(themeButton).toBeInTheDocument();
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('calls cycleTheme when theme button is clicked', () => {
    const cycleTheme = vi.fn();
    render(<DemoBottomBar {...defaultProps} cycleTheme={cycleTheme} />);

    fireEvent.click(screen.getByRole('button', { name: /theme: light/i }));
    expect(cycleTheme).toHaveBeenCalledTimes(1);
  });

  it('displays different theme icon and label', () => {
    render(
      <DemoBottomBar {...defaultProps} getThemeIcon={() => '🌙'} getThemeLabel={() => 'Dark'} />,
    );
    expect(screen.getByText('🌙')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('passes collapsed prop based on visible state', () => {
    const { rerender } = render(<DemoBottomBar {...defaultProps} visible={true} />);
    expect(screen.getByTestId('demo-bottom-panel')).toHaveAttribute('data-collapsed', 'false');

    rerender(<DemoBottomBar {...defaultProps} visible={false} />);
    expect(screen.getByTestId('demo-bottom-panel')).toHaveAttribute('data-collapsed', 'true');
  });

  it('has layout label', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByText('BottombarLayout')).toBeInTheDocument();
  });
});
