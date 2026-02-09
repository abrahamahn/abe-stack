// src/client/ui/src/theme/buildThemeCss.test.ts
import { generateThemeCss } from '@theme/buildThemeCss';
import { describe, expect, it } from 'vitest';

describe('generateThemeCss', () => {
  it('includes root tokens and dark mode overrides', () => {
    const css = generateThemeCss();

    expect(css).toContain(':root {');
    expect(css).toContain('--ui-color-primary:');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });
});
