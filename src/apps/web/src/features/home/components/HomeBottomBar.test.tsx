// apps/web/src/features/home/components/HomeBottomBar.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeBottomBar } from './HomeBottomBar';

import type { HomeBottomBarProps } from './HomeBottomBar';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

vi.mock('@abe-stack/ui', () => {
  const button = ({ children, onClick, ...props }: ComponentProps<'button'>): ReactElement => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  );
  const environmentBadge = ({ environment }: { environment: string }): ReactElement => (
    <span data-testid="env-badge">{environment}</span>
  );
  const kbd = ({ children }: { children: ReactNode }): ReactElement => <kbd>{children}</kbd>;
  const resizablePanel = ({
    children,
    collapsed,
    ...props
  }: {
    children: ReactNode;
    collapsed?: boolean;
    'data-testid'?: string;
  }): ReactElement => (
    <div data-testid={props['data-testid']} data-collapsed={collapsed}>
      {children}
    </div>
  );
  const text = ({ children }: { children: ReactNode }): ReactElement => <span>{children}</span>;
  const versionBadge = ({ version }: { version: string }): ReactElement => (
    <span data-testid="version-badge">{version}</span>
  );

  return {
    Button: button,
    EnvironmentBadge: environmentBadge,
    Kbd: kbd,
    ResizablePanel: resizablePanel,
    Text: text,
    VersionBadge: versionBadge,
  };
});

vi.mock('@/config', () => ({
  clientConfig: {
    uiVersion: '1.0.0',
    isDev: true,
  },
}));

vi.mock('../hooks', () => ({
  HOME_KEYBOARD_SHORTCUTS: [
    { key: 'T', description: 'Toggle top bar' },
    { key: 'L', description: 'Toggle left panel' },
  ],
}));

describe('HomeBottomBar', () => {
  const defaultProps: HomeBottomBarProps = {
    size: 8,
    visible: true,
    onResize: vi.fn(),
    cycleTheme: vi.fn(),
    getThemeIcon: () => '☀️',
    getThemeLabel: () => 'Light',
    cycleDensity: vi.fn(),
    getDensityLabel: () => 'Normal',
    cycleContrast: vi.fn(),
    getContrastLabel: () => 'System',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct data-testid', () => {
    render(<HomeBottomBar {...defaultProps} />);
    expect(screen.getByTestId('home-bottom-panel')).toBeInTheDocument();
  });

  it('renders version badge', () => {
    render(<HomeBottomBar {...defaultProps} />);
    expect(screen.getByTestId('version-badge')).toHaveTextContent('1.0.0');
  });

  it('renders environment badge', () => {
    render(<HomeBottomBar {...defaultProps} />);
    expect(screen.getByTestId('env-badge')).toHaveTextContent('development');
  });

  it('renders keyboard shortcuts', () => {
    render(<HomeBottomBar {...defaultProps} />);
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('calls cycleTheme when theme button clicked', () => {
    render(<HomeBottomBar {...defaultProps} />);
    const themeBtn = screen.getByRole('button', { name: /theme: light/i });
    fireEvent.click(themeBtn);
    expect(defaultProps.cycleTheme).toHaveBeenCalled();
  });

  it('calls cycleDensity when density button clicked', () => {
    render(<HomeBottomBar {...defaultProps} />);
    const densityBtn = screen.getByRole('button', { name: /density: normal/i });
    fireEvent.click(densityBtn);
    expect(defaultProps.cycleDensity).toHaveBeenCalled();
  });

  it('calls cycleContrast when contrast button clicked', () => {
    render(<HomeBottomBar {...defaultProps} />);
    const contrastBtn = screen.getByRole('button', { name: /contrast: system/i });
    fireEvent.click(contrastBtn);
    expect(defaultProps.cycleContrast).toHaveBeenCalled();
  });

  it('passes collapsed prop based on visible state', () => {
    const { rerender } = render(<HomeBottomBar {...defaultProps} visible={true} />);
    expect(screen.getByTestId('home-bottom-panel')).toHaveAttribute('data-collapsed', 'false');

    rerender(<HomeBottomBar {...defaultProps} visible={false} />);
    expect(screen.getByTestId('home-bottom-panel')).toHaveAttribute('data-collapsed', 'true');
  });
});
