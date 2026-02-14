// main/tools/scripts/scaffold/scaffold-module.test.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  generateTemplates,
  toCamelCase,
  toPascalCase,
  validateModuleName,
} from './scaffold-module';

// ============================================================================
// Name Validation
// ============================================================================

describe('validateModuleName', () => {
  test('rejects uppercase names', () => {
    expect(validateModuleName('MyModule')).toContain('kebab-case');
  });

  test('rejects names with spaces', () => {
    expect(validateModuleName('my module')).toContain('kebab-case');
  });

  test('rejects names starting with a number', () => {
    expect(validateModuleName('1module')).toContain('kebab-case');
  });

  test('accepts valid kebab-case names', () => {
    expect(validateModuleName('my-module')).toBeNull();
  });

  test('accepts single-word names', () => {
    expect(validateModuleName('widgets')).toBeNull();
  });

  test('rejects existing module names', () => {
    const result = validateModuleName('activities');
    expect(result).toContain('already exists');
  });
});

// ============================================================================
// Case Conversion
// ============================================================================

describe('toPascalCase', () => {
  test('converts kebab to PascalCase', () => {
    expect(toPascalCase('my-module')).toBe('MyModule');
  });

  test('handles single word', () => {
    expect(toPascalCase('widgets')).toBe('Widgets');
  });

  test('handles multi-segment', () => {
    expect(toPascalCase('my-cool-module')).toBe('MyCoolModule');
  });
});

describe('toCamelCase', () => {
  test('converts kebab to camelCase', () => {
    expect(toCamelCase('my-module')).toBe('myModule');
  });

  test('handles single word', () => {
    expect(toCamelCase('widgets')).toBe('widgets');
  });
});

// ============================================================================
// Template Generation
// ============================================================================

describe('generateTemplates', () => {
  test('generates expected file set', () => {
    const files = generateTemplates('test-widgets');
    const filenames = [...files.keys()];

    expect(filenames).toContain('index.ts');
    expect(filenames).toContain('types.ts');
    expect(filenames).toContain('service.ts');
    expect(filenames).toContain('service.test.ts');
    expect(filenames).toContain('handlers.ts');
    expect(filenames).toContain('handlers.test.ts');
    expect(filenames).toContain('routes.ts');
  });

  test('barrel exports use explicit named exports', () => {
    const files = generateTemplates('test-widgets');
    const barrel = files.get('index.ts');

    expect(barrel).toBeDefined();
    expect(barrel).toContain('export { listTestWidgets }');
    expect(barrel).toContain('export { handleListTestWidgets }');
    expect(barrel).toContain('export { testWidgetsRoutes }');
    expect(barrel).toContain('export type { TestWidgetsAppContext }');
    expect(barrel).not.toContain('export *');
  });

  test('routes.ts uses createRouteMap', () => {
    const files = generateTemplates('test-widgets');
    const routes = files.get('routes.ts');

    expect(routes).toBeDefined();
    expect(routes).toContain('createRouteMap');
    expect(routes).toContain('protectedRoute');
    expect(routes).toContain("'test-widgets'");
  });

  test('types.ts extends BaseContext', () => {
    const files = generateTemplates('my-feature');
    const types = files.get('types.ts');

    expect(types).toBeDefined();
    expect(types).toContain('extends BaseContext');
    expect(types).toContain('MyFeatureAppContext');
  });

  test('service.ts references correct context type', () => {
    const files = generateTemplates('my-feature');
    const service = files.get('service.ts');

    expect(service).toBeDefined();
    expect(service).toContain('MyFeatureAppContext');
    expect(service).toContain('listMyFeature');
  });

  test('file headers use correct path comments', () => {
    const files = generateTemplates('my-feature');

    for (const [filename, content] of files) {
      expect(content).toContain(`// main/server/core/src/my-feature/${filename}`);
    }
  });
});

// ============================================================================
// File Writing (temp directory)
// ============================================================================

describe('template file writing', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('writes all template files to disk', () => {
    const templates = generateTemplates('test-widgets');
    const targetDir = path.join(tmpDir, 'test-widgets');
    fs.mkdirSync(targetDir, { recursive: true });

    for (const [filename, content] of templates) {
      fs.writeFileSync(path.join(targetDir, filename), content, 'utf-8');
    }

    const written = fs.readdirSync(targetDir);
    expect(written).toHaveLength(7);
    expect(written).toContain('index.ts');
    expect(written).toContain('routes.ts');
  });

  test('template files are non-empty', () => {
    const templates = generateTemplates('test-widgets');

    for (const [, content] of templates) {
      expect(content.length).toBeGreaterThan(10);
    }
  });
});
