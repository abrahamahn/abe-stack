// packages/ui/src/components/__tests__/Spinner.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from '../Spinner';

describe('Spinner', () => {
  it('renders with default size token', () => {
    const { container } = render(<Spinner />);

    const spinner = container.querySelector('.ui-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('ui-spinner');
    expect(spinner).toHaveStyle({ '--ui-spinner-size': 'var(--ui-gap-lg)' });
  });

  it('applies custom size', () => {
    const { container } = render(<Spinner size="32px" />);

    const spinner = container.querySelector('.ui-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveStyle({ '--ui-spinner-size': '32px' });
  });

  it('renders safely with empty props', () => {
    expect(() => {
      render(<Spinner />);
    }).not.toThrow();
  });
});
