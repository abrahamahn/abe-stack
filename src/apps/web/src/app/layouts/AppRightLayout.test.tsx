import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRightLayout } from './AppRightLayout';

describe('AppRightLayout', () => {
  it('renders default title and children', () => {
    render(
      <AppRightLayout onClose={vi.fn()}>
        <div>Right content</div>
      </AppRightLayout>,
    );

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByText('Right content')).toBeInTheDocument();
  });

  it('renders custom title and handles close', () => {
    const onClose = vi.fn();
    render(
      <AppRightLayout title="Custom Right" onClose={onClose}>
        <div>Right content</div>
      </AppRightLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse right panel' }));
    expect(screen.getByRole('heading', { name: 'Custom Right' })).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
