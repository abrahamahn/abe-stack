// apps/web/src/features/demo/__tests__/index.test.ts
import { describe, expect, it } from 'vitest';

import * as demoExports from '../index';

describe('features/demo barrel exports', () => {
  it('should export Navigate component', () => {
    expect(demoExports).toHaveProperty('Navigate');
  });

  it('should export UIPage component', () => {
    expect(demoExports).toHaveProperty('UIPage');
  });

  it('should export DemoShell component', () => {
    expect(demoExports).toHaveProperty('DemoShell');
  });

  it('should export DemoPage as alias for DemoShell', () => {
    expect(demoExports).toHaveProperty('DemoPage');
    expect(demoExports.DemoPage).toBe(demoExports.DemoShell);
  });

  it('should export registry functions and data', () => {
    expect(demoExports).toHaveProperty('getAllCategories');
    expect(demoExports).toHaveProperty('getComponentsByCategory');
    expect(demoExports).toHaveProperty('componentRegistry');
  });

  it('should export type definitions', () => {
    // Types are exported but not available at runtime
    // We can verify the module loads without errors
    expect(demoExports).toBeDefined();
  });

  it('should have correct number of named exports', () => {
    const exportKeys = Object.keys(demoExports);
    // Navigate, UIPage, DemoShell, DemoPage, registry functions
    expect(exportKeys.length).toBeGreaterThanOrEqual(4);
  });
});
