
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const isQuiet = process.argv.includes('--quiet');
function log(...args: unknown[]): void {
  if (!isQuiet) console.log(...args);
}

// Configuration: Which tsconfigs to update and where to scan for aliases
interface AliasConfig {
  configFile: string;
  baseUrl: string; // relative to configFile location
  scilentlyIgnore?: string[]; // Folders to ignore
  // List of directories to scan (relative to configFile location)
  // Higher priority sources come first in the list
  scanDirs: string[];
  // Mapping of source dir to alias prefix (e.g. "src/modules" -> "@")
  // If not provided, it assumes direct mapping (folder "auth" -> "@auth")
  prefixMapping?: Record<string, string>;
  // Explicit aliases to always include (overrides scans)
  manualAliases?: Record<string, string[]>;
}

const configs: AliasConfig[] = [
  {
    configFile: 'apps/server/tsconfig.json',
    baseUrl: '.',
    scanDirs: [
        'src/modules',        // Priority Source 1
        'src/utils',          // Priority Source 2 (@utils)
        'src/infrastructure', // Priority Source 3
        'src/config'          // Priority Source 4
    ],
    manualAliases: {
        '@/*': ['./src/*'],
        // Package aliases
        '@abe-stack/core': ['../../packages/core/src/index.ts'],
        '@abe-stack/core/*': ['../../packages/core/src/*'],
        '@abe-stack/db': ['../../packages/db/src/index.ts'],
        '@abe-stack/db/*': ['../../packages/db/src/*'],
        '@abe-stack/media': ['../../packages/media/src/index.ts'],
        '@abe-stack/media/*': ['../../packages/media/src/*'],
        '@abe-stack/contracts': ['../../packages/contracts/src/index.ts'],
        '@abe-stack/contracts/*': ['../../packages/contracts/src/*'],
    }
  },
  {
    configFile: 'packages/ui/tsconfig.json',
    baseUrl: '.',
    scanDirs: ['src', 'src/layouts'], // Scan src root and src/layouts
    scilentlyIgnore: ['__tests__', 'styles', 'types', 'index.ts', 'vite-env.d.ts'],
    manualAliases: {
        '@abe-stack/core': ['../core/src'],
        '@abe-stack/core/*': ['../core/src/*'],
    }
  },
  {
      configFile: 'apps/desktop/tsconfig.json',
      baseUrl: '.',
      scanDirs: [],
      manualAliases: {
          '@/*': ['./src/*'],
          '@ipc': ['./src/electron/ipc'],
          '@ipc/*': ['./src/electron/ipc/*']
      }
  }
];

function getSubdirectories(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
}

function updateTsConfig(config: AliasConfig): boolean {
    const fullPath = path.join(ROOT, config.configFile);
    if (!fs.existsSync(fullPath)) {
        console.error(`Missing config: ${config.configFile}`);
        return false;
    }

    const configDir = path.dirname(fullPath);
    let paths: Record<string, string[]> = { ...config.manualAliases };

    // Scan directories
    for (const scanDirRelative of config.scanDirs) {
        const scanDir = path.join(configDir, scanDirRelative);

        // Special case: if scanDir is "src/utils", we want @utils pointing to it, not @utils/utils
        // But the generic logic scans SUBDIRS.
        // If we want to alias the dir itself, that's different.
        // Let's assume scanDirs are PARENTS of the aliases (e.g. src/modules -> @auth, @users).

        // Handling "src/utils" which contains index.ts but is not a container of utils module.
        // If "scanDirs" contains a folder that IS the alias target itself, we need a flag?
        // For now, let's treat "src/utils" as a PARENT? No, "src/utils" has "index.ts".
        // Actually, the server config has "@utils": ["./src/utils"].
        // So scanDirs logic needs to be robust.

        // Adjusted Logic:
        // If the scanDir ends in "utils" or "config" (common singletons), check if it maps to a single alias.
        // But standardized approach: Scan subdirectories of the scanDir.

        // What about @utils? usage: import { foo } from '@utils'.
        // This implies src/utils/index.ts exists.
        // My previous audit showed @utils -> ./src/utils.

        // Let's add top-level folder detection?
        // Actually, for the server, I'll rely on "src/modules" scanning.
        // And for "src/utils", I'll add it to MANUAL aliases if it's a singleton.
        // Wait, I put 'src/utils' in scanDirs. That implies looking for src/utils/foo -> @foo.
        // That is NOT what we want.
        // Removing 'src/utils' and 'src/config' from scanDirs in the config object above
        // and moving them to manual aliases logic or special handling?

        // Let's keep it simple: "scanDirs" are folders containing modules.
        // "src/modules" contains "auth". => "@auth": ["src/modules/auth"].
        // "src/infrastructure" contains "cache". => "@cache": ["src/infrastructure/cache"].
    }

    // Correcting scanDirs for Server based on this logic:
    // We want folders INSIDE modules/infra to become aliases.
    const resolvedScanDirs = config.scanDirs.filter(d => !d.endsWith('utils') && !d.endsWith('config'));

    for (const scanDirRelative of resolvedScanDirs) {
        const scanDir = path.join(configDir, scanDirRelative);
        const subdirs = getSubdirectories(scanDir);

        for (const subdir of subdirs) {
             if (config.scilentlyIgnore?.includes(subdir)) continue;

             const alias = `@${subdir}`;
             const aliasPath = `./${path.join(scanDirRelative, subdir)}`;

             // Conflict Resolution: If alias exists, skip (First ScanDir Wins priority)
             if (!paths[alias]) {
                 paths[alias] = [aliasPath];
                 paths[`${alias}/*`] = [`${aliasPath}/*`];
             }
        }
    }

    // Add Utils/Config if they exist as dirs in src but weren't scanned
    const specialDirs = ['utils', 'config', 'shared', 'types'];
    for (const special of specialDirs) {
        const specialRel = `src/${special}`;
        const specialPath = path.join(configDir, specialRel);
        if (fs.existsSync(specialPath)) {
             const alias = `@${special}`;
             if (!paths[alias]) {
                 paths[alias] = [`./${specialRel}`];
                 paths[`${alias}/*`] = [`./${specialRel}/*`];
             }
        }
    }

    // Sort paths alphabetically
    const sortedPaths = Object.keys(paths).sort().reduce((acc, key) => {
        acc[key] = paths[key];
        return acc;
    }, {} as Record<string, string[]>);

    // Read and update file
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Loose JSON parsing to preserve comments if possible?
    // Standard JSON.parse fails on comments.
    // We can regex replace the "paths" block.

    const pathsString = JSON.stringify(sortedPaths, null, 6)
        .replace(/\n      /g, '\n      ') // Adjust indentation
        .replace(/^{/, '') // Remove outer braces from stringify
        .replace(/}$/, '') // Remove outer braces
        .trim();

    // Regex to find "paths": { ... }
    // Handles nested braces? No, paths is usually simple string arrays.
    // Match "paths": { [content] }
    const regex = /("paths"\s*:\s*\{)([\s\S]*?)(\})/;

    const newContent = content.replace(regex, `$1\n      ${pathsString}\n    $3`);

    if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        log(`✓ Updated ${config.configFile}`);
        return true;
    }
    return false;
}

function main() {
    log('Syncing TSConfig Paths...');
    let changed = false;
    for (const config of configs) {
        if (updateTsConfig(config)) {
            changed = true;
        }
    }
    if (!changed) log('All configs already up to date.');
}

main();
