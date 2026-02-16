// main/client/ui/src/elements/Text.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Text } from './Text';

describe('Text', () => {
  it('renders default paragraph with tone', () => {
    render(<Text>Body</Text>);

    const text = screen.getByText('Body');
    expect(text.tagName).toBe('P');
    expect(text).toHaveAttribute('data-tone', 'default');
    expect(text).toHaveClass('text');
  });

  it('supports custom element and tone', () => {
    render(
      <Text as="span" tone="danger">
        Warning
      </Text>,
    );

    const text = screen.getByText('Warning');
    expect(text.tagName).toBe('SPAN');
    expect(text).toHaveAttribute('data-tone', 'danger');
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(
      <Text ref={ref} className="custom-text">
        Label
      </Text>,
    );

    const text = screen.getByText('Label');
    expect(text).toHaveClass('custom-text');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
