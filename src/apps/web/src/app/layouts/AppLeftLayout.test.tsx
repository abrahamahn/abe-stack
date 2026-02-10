// src/apps/web/src/app/layouts/AppLeftLayout.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppLeftLayout } from './AppLeftLayout';

describe('AppLeftLayout', () => {
  it('renders children', () => {
    render(
      <AppLeftLayout>
        <div>Left content</div>
      </AppLeftLayout>,
    );

    expect(screen.getByText('Left content')).toBeInTheDocument();
  });
});
