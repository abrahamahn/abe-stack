// src/apps/web/src/app/layouts/AppLeftLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppLeftLayout } from './AppLeftLayout';

describe('AppLeftLayout', () => {
  it('renders default title and children', () => {
    render(
      <AppLeftLayout onClose={vi.fn()}>
        <div>Left content</div>
      </AppLeftLayout>,
    );

    expect(screen.getByRole('heading', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.getByText('Left content')).toBeInTheDocument();
  });

  it('renders custom title and handles close', () => {
    const onClose = vi.fn();
    render(
      <AppLeftLayout title="Custom Left" onClose={onClose}>
        <div>Left content</div>
      </AppLeftLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse left panel' }));
    expect(screen.getByRole('heading', { name: 'Custom Left' })).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
