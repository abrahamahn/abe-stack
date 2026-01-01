// packages/ui/src/primitives/__tests__/TextArea.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextArea } from '../TextArea';

describe('TextArea', () => {
  it('renders a textarea with class', () => {
    render(<TextArea placeholder="Message" />);

    const textarea = screen.getByPlaceholderText('Message');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveClass('ui-textarea');
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(<TextArea ref={ref} className="custom-textarea" aria-label="Notes" />);

    const textarea = screen.getByRole('textbox', { name: 'Notes' });
    expect(textarea).toHaveClass('custom-textarea');
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
