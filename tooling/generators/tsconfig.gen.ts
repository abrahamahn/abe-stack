// config/generators/tsconfig.gen.ts
/**
 * TypeScript Configuration Generator
 *
 * Generates:
 *   .config/tsconfig.base.json
 *   .config/tsconfig.react.json
 *   .config/tsconfig.node.json
 *   .config/tsconfig.eslint.json
 *   tsconfig.json (root)
 *   apps/{app}/tsconfig.json
 *   packages/{pkg}/tsconfig.json
 */

import * as path from 'path';
import * as fs from 'fs';

import {
  baseCompilerOptions,
  baseExclude,
  excludedAliasNames,
  maxAliasDepth,
  nodeCompilerOptions,
  packageDirs,
  projects,
  reactCompilerOptions,
  skipDirs,
} from '../schema/typescript';

import {
  createLogger,
  generatePathAliases,
  getWorkspaceProjects,
  ROOT,
  writeJsonFile,
} from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * Generate tsconfig.base.json with section comments (JSONC format)
 */
function generateBaseConfigContent(): string {
  return `{
  "compilerOptions": {
    /* 1. Monorepo & Build Performance */
    "composite": ${JSON.stringify(baseCompilerOptions.composite)},
    "declaration": ${JSON.stringify(baseCompilerOptions.declaration)},
    "declarationMap": ${JSON.stringify(baseCompilerOptions.declarationMap)},
    "sourceMap": ${JSON.stringify(baseCompilerOptions.sourceMap)},
    "incremental": ${JSON.stringify(baseCompilerOptions.incremental)},

    /* 2. Language Fundamentals */
    "target": ${JSON.stringify(baseCompilerOptions.target)},
    "lib": ${JSON.stringify(baseCompilerOptions.lib)},
    "module": ${JSON.stringify(baseCompilerOptions.module)},
    "moduleResolution": ${JSON.stringify(baseCompilerOptions.moduleResolution)},
    "resolveJsonModule": ${JSON.stringify(baseCompilerOptions.resolveJsonModule)},

    /* 3. Modern Strictness */
    "strict": ${JSON.stringify(baseCompilerOptions.strict)},
    "noUncheckedIndexedAccess": ${JSON.stringify(baseCompilerOptions.noUncheckedIndexedAccess)},
    "noImplicitOverride": ${JSON.stringify(baseCompilerOptions.noImplicitOverride)},
    "noFallthroughCasesInSwitch": ${JSON.stringify(baseCompilerOptions.noFallthroughCasesInSwitch)},
    "noUnusedLocals": ${JSON.stringify(baseCompilerOptions.noUnusedLocals)},
    "noUnusedParameters": ${JSON.stringify(baseCompilerOptions.noUnusedParameters)},
    "noImplicitReturns": ${JSON.stringify(baseCompilerOptions.noImplicitReturns)},

    /* 4. Module Safety */
    "isolatedModules": ${JSON.stringify(baseCompilerOptions.isolatedModules)},
    "verbatimModuleSyntax": ${JSON.stringify(baseCompilerOptions.verbatimModuleSyntax)},
    "esModuleInterop": ${JSON.stringify(baseCompilerOptions.esModuleInterop)},
    "allowSyntheticDefaultImports": ${JSON.stringify(baseCompilerOptions.allowSyntheticDefaultImports)},
    "forceConsistentCasingInFileNames": ${JSON.stringify(baseCompilerOptions.forceConsistentCasingInFileNames)},
    "skipLibCheck": ${JSON.stringify(baseCompilerOptions.skipLibCheck)},

    /* 5. Clean Console */
    "ignoreDeprecations": ${JSON.stringify(baseCompilerOptions.ignoreDeprecations)}
  },
  "exclude": ${JSON.stringify([...baseExclude])}
}
`;
}

/**
 * Write a file and return true if changed
 */
function writeFile(filePath: string, content: string): boolean {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  if (existing === content) {
    return false;
  }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  return true;
}

/**
 * Generate base tsconfig files in .config/
 */
function generateBaseTsconfigs(
  checkOnly: boolean,
  log: ReturnType<typeof createLogger>,
): GeneratorResult {
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };
  const tsDir = path.join(ROOT, '.config');

  // tsconfig.base.json (with comments)
  const basePath = path.join(tsDir, 'tsconfig.base.json');
  const baseContent = generateBaseConfigContent();

  if (checkOnly) {
    const existing = fs.existsSync(basePath) ? fs.readFileSync(basePath, 'utf-8') : '';
    if (existing !== baseContent) {
      result.generated.push(basePath);
    } else {
      result.unchanged.push(basePath);
    }
  } else {
    if (writeFile(basePath, baseContent)) {
      result.generated.push(basePath);
      log.log(`  Generated: ${path.relative(ROOT, basePath)}`);
    } else {
      result.unchanged.push(basePath);
    }
  }

  // tsconfig.react.json
  const reactPath = path.join(tsDir, 'tsconfig.react.json');
  const reactConfig = {
    extends: './tsconfig.base.json',
    compilerOptions: { ...reactCompilerOptions },
  };

  if (checkOnly) {
    const existing = fs.existsSync(reactPath) ? fs.readFileSync(reactPath, 'utf-8') : '';
    const expected = JSON.stringify(reactConfig, null, 2) + '\n';
    if (existing !== expected) {
      result.generated.push(reactPath);
    } else {
      result.unchanged.push(reactPath);
    }
  } else {
    if (writeJsonFile(reactPath, reactConfig)) {
      result.generated.push(reactPath);
      log.log(`  Generated: ${path.relative(ROOT, reactPath)}`);
    } else {
      result.unchanged.push(reactPath);
    }
  }

  // tsconfig.node.json
  const nodePath = path.join(tsDir, 'tsconfig.node.json');
  const nodeConfig = {
    extends: './tsconfig.base.json',
    compilerOptions: { ...nodeCompilerOptions },
  };

  if (checkOnly) {
    const existing = fs.existsSync(nodePath) ? fs.readFileSync(nodePath, 'utf-8') : '';
    const expected = JSON.stringify(nodeConfig, null, 2) + '\n';
    if (existing !== expected) {
      result.generated.push(nodePath);
    } else {
      result.unchanged.push(nodePath);
    }
  } else {
    if (writeJsonFile(nodePath, nodeConfig)) {
      result.generated.push(nodePath);
      log.log(`  Generated: ${path.relative(ROOT, nodePath)}`);
    } else {
      result.unchanged.push(nodePath);
    }
  }

  // tsconfig.eslint.json (for ESLint to use)
  const eslintPath = path.join(tsDir, 'tsconfig.eslint.json');
  const eslintConfig = {
    extends: './tsconfig.node.json',
    compilerOptions: {
      composite: false,
      declaration: false,
      declarationMap: false,
      incremental: false,
      noEmit: true,
    },
    include: [
      '../apps/*/src/**/*',
      '../packages/*/src/**/*',
      '../tools/**/*',
      '../tooling/**/*',
      '../.config/**/*',
      '../*.ts',
      '../*.js',
    ],
    exclude: ['../node_modules', '../**/dist', '../**/build'],
  };

  if (checkOnly) {
    const existing = fs.existsSync(eslintPath) ? fs.readFileSync(eslintPath, 'utf-8') : '';
    const expected = JSON.stringify(eslintConfig, null, 2) + '\n';
    if (existing !== expected) {
      result.generated.push(eslintPath);
    } else {
      result.unchanged.push(eslintPath);
    }
  } else {
    if (writeJsonFile(eslintPath, eslintConfig)) {
      result.generated.push(eslintPath);
      log.log(`  Generated: ${path.relative(ROOT, eslintPath)}`);
    } else {
      result.unchanged.push(eslintPath);
    }
  }

  return result;
}

/**
 * Resolve extends path based on project type
 */
function getExtendsPath(projectDir: string, extendsType: 'react' | 'node' | 'base'): string {
  const relativePath = path.relative(projectDir, path.join(ROOT, '.config'));
  const configMap = {
    react: 'tsconfig.react.json',
    node: 'tsconfig.node.json',
    base: 'tsconfig.base.json',
  };
  return `${relativePath.replace(/\\/g, '/')}/${configMap[extendsType]}`;
}

/**
 * Get project references from package names
 */
function getProjectReferences(
  projectDir: string,
  refPackageNames: string[] | undefined,
): Array<{ path: string }> {
  if (!refPackageNames || refPackageNames.length === 0) return [];

  const refs: Array<{ path: string }> = [];

  for (const pkgName of refPackageNames) {
    const pkgDir = packageDirs[pkgName];
    if (!pkgDir) continue;

    const refPath = path.relative(projectDir, path.join(ROOT, pkgDir)).replace(/\\/g, '/');
    refs.push({ path: refPath.startsWith('.') ? refPath : `./${refPath}` });
  }

  return refs.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Generate project tsconfig.json files
 */
function generateProjectTsconfigs(
  checkOnly: boolean,
  log: ReturnType<typeof createLogger>,
): GeneratorResult {
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  for (const [projectPath, config] of Object.entries(projects)) {
    const projectDir = path.join(ROOT, projectPath);
    const tsconfigPath = path.join(projectDir, 'tsconfig.json');

    if (!fs.existsSync(projectDir)) {
      result.errors.push(`Project directory not found: ${projectPath}`);
      continue;
    }

    // Determine paths - either manual or auto-discovered
    let paths: Record<string, string[]>;
    if (config.manualPaths) {
      paths = config.manualPaths;
    } else if (config.aliasScanDirs) {
      paths = generatePathAliases(projectDir, config.aliasScanDirs, {
        maxDepth: maxAliasDepth,
        skipDirs,
        excludedNames: excludedAliasNames,
        aliasPrefix: '@',
      });
    } else {
      paths = { '@/*': ['./src/*'] };
    }

    // Build the tsconfig
    const tsconfig: Record<string, unknown> = {
      extends: getExtendsPath(projectDir, config.extends),
      compilerOptions: {
        ...(config.compilerOptions ?? {}),
        types: config.types,
        paths,
        tsBuildInfoFile:
          config.compilerOptions?.tsBuildInfoFile ??
          (projectPath.startsWith('apps/')
            ? `./node_modules/.cache/tsconfig.${path.basename(projectPath)}.tsbuildinfo`
            : './tsconfig.tsbuildinfo'),
      },
      include: config.include ?? ['src/**/*'],
      exclude: ['node_modules', ...(config.exclude ?? [])],
    };

    // Add references if specified
    const refs = getProjectReferences(projectDir, config.references);
    if (refs.length > 0) {
      tsconfig.references = refs;
    }

    // Write the file
    if (checkOnly) {
      const existing = fs.existsSync(tsconfigPath) ? fs.readFileSync(tsconfigPath, 'utf-8') : '';
      const expected = JSON.stringify(tsconfig, null, 2) + '\n';
      if (existing !== expected) {
        result.generated.push(tsconfigPath);
      } else {
        result.unchanged.push(tsconfigPath);
      }
    } else {
      if (writeJsonFile(tsconfigPath, tsconfig)) {
        result.generated.push(tsconfigPath);
        log.log(`  Generated: ${path.relative(ROOT, tsconfigPath)}`);
      } else {
        result.unchanged.push(tsconfigPath);
      }
    }
  }

  return result;
}

/**
 * Generate root tsconfig.json with project references
 */
function generateRootTsconfig(
  checkOnly: boolean,
  log: ReturnType<typeof createLogger>,
): GeneratorResult {
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };
  const rootTsconfigPath = path.join(ROOT, 'tsconfig.json');

  // Get all workspace projects
  const workspaceProjects = getWorkspaceProjects(ROOT);
  const references = workspaceProjects
    .filter((p) => fs.existsSync(path.join(p.dir, 'tsconfig.json')))
    .map((p) => ({
      path: './' + path.relative(ROOT, p.dir).replace(/\\/g, '/'),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const rootTsconfig = {
    files: [],
    references,
  };

  if (checkOnly) {
    const existing = fs.existsSync(rootTsconfigPath)
      ? fs.readFileSync(rootTsconfigPath, 'utf-8')
      : '';
    const expected = JSON.stringify(rootTsconfig, null, 2) + '\n';
    if (existing !== expected) {
      result.generated.push(rootTsconfigPath);
    } else {
      result.unchanged.push(rootTsconfigPath);
    }
  } else {
    if (writeJsonFile(rootTsconfigPath, rootTsconfig)) {
      result.generated.push(rootTsconfigPath);
      log.log(`  Generated: ${path.relative(ROOT, rootTsconfigPath)}`);
    } else {
      result.unchanged.push(rootTsconfigPath);
    }
  }

  return result;
}

/**
 * Main generator function
 */
export function generateTsconfigs(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { checkOnly = false, quiet = false } = options;
  const log = createLogger(quiet);

  log.log('\nGenerating TypeScript configs...');

  const results: GeneratorResult[] = [
    generateBaseTsconfigs(checkOnly, log),
    generateProjectTsconfigs(checkOnly, log),
    generateRootTsconfig(checkOnly, log),
  ];

  // Combine results
  const combined: GeneratorResult = {
    generated: results.flatMap((r) => r.generated),
    unchanged: results.flatMap((r) => r.unchanged),
    errors: results.flatMap((r) => r.errors),
  };

  if (!checkOnly) {
    if (combined.generated.length > 0) {
      log.log(`\n  ${String(combined.generated.length)} tsconfig(s) generated`);
    } else {
      log.log('\n  All tsconfigs up to date');
    }
  }

  return combined;
}
