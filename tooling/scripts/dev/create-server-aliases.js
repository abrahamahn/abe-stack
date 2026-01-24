// tools/dev/create-server-aliases.js
/* global require, process */
// tools/dev/create-server-aliases.js
// Creates node_modules alias symlinks for server dist output based on tsconfig paths.

const fs = require('node:fs');
const path = require('node:path');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function createSymlink(target, linkPath) {
  ensureDir(path.dirname(linkPath));
  removeIfExists(linkPath);
  const relativeTarget = path.relative(path.dirname(linkPath), target);
  fs.symlinkSync(relativeTarget, linkPath, 'dir');
}

function stripTrailingStar(spec) {
  return spec.endsWith('/*') ? spec.slice(0, -2) : spec;
}

function stripLeadingSrc(target) {
  const normalized = target.replace(/\\/g, '/');
  return normalized.startsWith('./src/')
    ? normalized.slice('./src/'.length)
    : normalized.startsWith('src/')
      ? normalized.slice('src/'.length)
      : normalized.replace(/^\.\//, '');
}

function main() {
  const deployDir = process.argv[2] || '/app/server-deploy';
  const tsconfigPath = process.argv[3] || 'apps/server/tsconfig.json';

  const tsconfig = readJson(tsconfigPath);
  const paths = (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) || {};
  const outDir = (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) || './dist';

  const distDir = path.resolve(deployDir, outDir);
  const nodeModulesDir = path.resolve(deployDir, 'node_modules');

  ensureDir(nodeModulesDir);

  const seen = new Set();

  for (const [alias, targets] of Object.entries(paths)) {
    const baseAlias = stripTrailingStar(alias);
    if (baseAlias === '@' || baseAlias === '@/*') {
      continue;
    }
    if (seen.has(baseAlias)) {
      continue;
    }
    seen.add(baseAlias);

    const firstTarget = Array.isArray(targets) ? targets[0] : undefined;
    if (!firstTarget) {
      continue;
    }

    const targetBase = stripTrailingStar(firstTarget);
    const targetRel = stripLeadingSrc(targetBase);
    const targetPath = path.resolve(distDir, targetRel);

    if (!fs.existsSync(targetPath)) {
      continue;
    }

    const linkPath = path.resolve(nodeModulesDir, baseAlias);
    createSymlink(targetPath, linkPath);
  }
}

main();
