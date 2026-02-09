// src/client/ui/src/layouts/containers/PageContainer.test.tsx
// client/ui/src/layouts/__tests__/PageContainer.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('renders a main element with defaults', () => {
    render(<PageContainer>Content</PageContainer>);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('page-container');
  });

  it('supports custom sizing props', () => {
    render(
      <PageContainer maxWidth={1200} gap={20} padding="24px" data-testid="page-container">
        Body
      </PageContainer>,
    );

    const main = screen.getByTestId('page-container');
    expect(main).toHaveStyle({
      ['--ui-page-max-width']: '1200px',
      ['--ui-page-gap']: '20px',
      ['--ui-page-padding']: '24px',
    });
  });

  it('forwards arbitrary props to main', () => {
    render(
      <PageContainer aria-label="Page" id="page">
        Main
      </PageContainer>,
    );

    const main = screen.getByRole('main', { name: 'Page' });
    expect(main).toHaveAttribute('id', 'page');
  });
});
