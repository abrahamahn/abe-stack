/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Accordion } from '../Accordion';

const items = [
  { id: 'one', title: 'Section One', content: 'Content One' },
  { id: 'two', title: 'Section Two', content: 'Content Two' },
];

describe('Accordion', () => {
  it('toggles open/closed on click and updates aria-expanded', () => {
    render(<Accordion items={items} />);

    const headerOne = screen.getByRole('button', { name: /section one/i });
    expect(screen.queryByText('Content One')).not.toBeInTheDocument();
    expect(headerOne).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(headerOne);
    expect(screen.getByText('Content One')).toBeInTheDocument();
    expect(headerOne).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(headerOne);
    expect(screen.queryByText('Content One')).not.toBeInTheDocument();
    expect(headerOne).toHaveAttribute('aria-expanded', 'false');
  });

  it('switches the open panel and calls onChange', () => {
    const onChange = vi.fn();
    render(<Accordion items={items} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /section one/i }));
    expect(onChange).toHaveBeenCalledWith('one');
    expect(screen.getByText('Content One')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /section two/i }));
    expect(onChange).toHaveBeenCalledWith('two');
    expect(screen.queryByText('Content One')).not.toBeInTheDocument();
    expect(screen.getByText('Content Two')).toBeInTheDocument();
  });
});
