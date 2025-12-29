/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Radio } from '../Radio';

describe('Radio', () => {
  it('selects and re-selects via keyboard', () => {
    const onSelectA = vi.fn();
    const onSelectB = vi.fn();
    render(
      <div>
        <Radio name="group" label="Option A" checked={true} onCheckedChange={onSelectA} />
        <Radio name="group" label="Option B" checked={false} onCheckedChange={onSelectB} />
      </div>,
    );

    const optionA = screen.getByLabelText(/option a/i);
    const optionB = screen.getByLabelText(/option b/i);

    fireEvent.keyDown(optionB, { key: ' ' });
    expect(onSelectB).toHaveBeenCalled();

    fireEvent.keyDown(optionA, { key: ' ' });
    expect(onSelectA).toHaveBeenCalled();
  });
});
