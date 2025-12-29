/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// React import kept for JSX transform in test
import { InputPrimitive } from '../../primitives/InputPrimitive';
import { Text } from '../../primitives/Text';

describe('InputPrimitive', () => {
  it('renders with label', () => {
    render(
      <label>
        <Text as="span">Email</Text>
        <InputPrimitive placeholder="you@example.com" />
      </label>,
    );
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });
});
