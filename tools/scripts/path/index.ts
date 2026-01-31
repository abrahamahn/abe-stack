// tools/scripts/path/index.ts
/**
 * Path export scripts for generating project file listings
 *
 * Scripts:
 * - md.ts: Exports markdown files to .tmp/PATH-md.md
 * - config.ts: Exports config/infra files to .tmp/PATH-config.md
 * - code.ts: Exports source code files to .tmp/PATH-code.md
 * - all.ts: Exports all files to .tmp/PATH-all.md
 *
 * @module tools/scripts/path
 */

export { CONFIG_DIRECTORIES, getRootConfigFiles } from './config';
