/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Popover } from '../Popover';

describe('Popover', () => {
  it('opens on trigger click and closes on Escape, returning focus', () => {
    render(<Popover trigger={<button>Show</button>}>Popover content</Popover>);

    expect(screen.queryByText(/popover content/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Show'));
    expect(screen.getByText(/popover content/i)).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText(/popover content/i)).not.toBeInTheDocument();
    expect(screen.getByText('Show')).toHaveFocus();
  });
});
