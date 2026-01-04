// packages/ui/src/components/__tests__/Box.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Box } from '../Box';

describe('Box', () => {
  it('renders children with default layout class', () => {
    render(<Box>Content</Box>);

    const box = screen.getByText('Content');
    expect(box).toHaveClass('box');
  });

  it('applies padding and flex direction variables', () => {
    render(
      <Box padding={12} flexDirection="row">
        Row
      </Box>,
    );

    const box = screen.getByText('Row');
    expect(box).toHaveStyle({
      '--ui-box-padding': '12px',
      '--ui-box-direction': 'row',
    });
  });

  it('supports string padding values and className', () => {
    render(
      <Box padding="2rem" className="custom-box">
        Boxed
      </Box>,
    );

    const box = screen.getByText('Boxed');
    expect(box).toHaveClass('custom-box');
    expect(box).toHaveStyle({ '--ui-box-padding': '2rem' });
  });

  it('renders safely with null children', () => {
    expect(() => {
      render(<Box>{null}</Box>);
    }).not.toThrow();
  });
});
