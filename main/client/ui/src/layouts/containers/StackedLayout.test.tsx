// main/client/ui/src/layouts/containers/StackedLayout.test.tsx
// client/ui/src/layouts/__tests__/StackedLayout.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { StackedLayout } from './StackedLayout';

describe('StackedLayout', () => {
  it('renders children content', () => {
    render(
      <StackedLayout>
        <div>Content</div>
      </StackedLayout>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders hero when provided', () => {
    render(
      <StackedLayout hero={<div>Hero</div>}>
        <div>Body</div>
      </StackedLayout>,
    );

    expect(screen.getByText('Hero')).toBeInTheDocument();
  });

  it('handles null hero without crashing', () => {
    expect(() => {
      render(
        <StackedLayout hero={null}>
          <div>Body</div>
        </StackedLayout>,
      );
    }).not.toThrow();
  });
});
