// main/apps/web/src/app/layouts/AppRightLayout.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRightLayout } from './AppRightLayout';

describe('AppRightLayout', () => {
  it('renders children', () => {
    render(
      <AppRightLayout>
        <div>Right content</div>
      </AppRightLayout>,
    );

    expect(screen.getByText('Right content')).toBeInTheDocument();
  });
});
