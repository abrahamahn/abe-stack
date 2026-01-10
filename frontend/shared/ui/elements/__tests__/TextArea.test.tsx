// packages/ui/src/elements/__tests__/TextArea.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextArea } from '../TextArea';

describe('TextArea', () => {
  it('renders a textarea with base class', () => {
    render(<TextArea placeholder="Enter text" />);

    const textarea = screen.getByPlaceholderText('Enter text');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveClass('ui-textarea');
  });

  it('merges custom className with base class', () => {
    render(<TextArea className="custom" data-testid="ta" />);

    const textarea = screen.getByTestId('ta');
    expect(textarea).toHaveClass('ui-textarea');
    expect(textarea).toHaveClass('custom');
  });

  it('forwards ref to textarea element', () => {
    const ref = { current: null };
    render(<TextArea ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
