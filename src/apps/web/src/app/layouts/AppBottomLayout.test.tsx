// src/apps/web/src/app/layouts/AppBottomLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppBottomLayout } from './AppBottomLayout';

describe('AppBottomLayout', () => {
  it('renders shortcuts and invokes control handlers', () => {
    const cycleTheme = vi.fn();
    const cycleDensity = vi.fn();
    const cycleContrast = vi.fn();

    render(
      <AppBottomLayout
        size={8}
        visible
        onResize={vi.fn()}
        cycleTheme={cycleTheme}
        getThemeIcon={() => '☀️'}
        getThemeLabel={() => 'Light'}
        cycleDensity={cycleDensity}
        getDensityLabel={() => 'Normal'}
        cycleContrast={cycleContrast}
        getContrastLabel={() => 'System'}
      />,
    );

    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Density')).toBeInTheDocument();
    expect(screen.getByText('Contrast')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Density:/i }));
    fireEvent.click(screen.getByRole('button', { name: /Contrast:/i }));
    fireEvent.click(screen.getByRole('button', { name: /Theme:/i }));

    expect(cycleDensity).toHaveBeenCalledTimes(1);
    expect(cycleContrast).toHaveBeenCalledTimes(1);
    expect(cycleTheme).toHaveBeenCalledTimes(1);
  });
});
