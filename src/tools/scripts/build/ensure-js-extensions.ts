// src/tools/scripts/build/ensure-js-extensions.ts
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const targetDir = process.argv[2] ?? 'dist';
const baseDir = path.resolve(rootDir, targetDir);

const importFromRegex = /(from\s+['"])(\.?\.?\/[^'"?]+)(['"])/g;
const sideEffectImportRegex = /(import\s+['"])(\.?\.?\/[^'"?]+)(['"])/g;
const dynamicImportRegex = /(import\(\s*['"])(\.?\.?\/[^'"?]+)(['"]\s*\))/g;

function hasExtension(specifier: string): boolean {
  const lastSegment = specifier.split('/').pop() ?? '';
  return /\.[a-zA-Z0-9]+$/.test(lastSegment);
}

function normalizeSpecifier(fromFile: string, specifier: string): string {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return specifier;
  }
  const baseDir = path.dirname(fromFile);
  if (hasExtension(specifier)) {
    const fileCandidate = path.resolve(baseDir, specifier);
    if (fs.existsSync(fileCandidate)) {
      return specifier;
    }
    if (specifier.endsWith('.js')) {
      const withoutExt = specifier.slice(0, -3);
      const indexCandidate = path.resolve(baseDir, withoutExt, 'index.js');
      if (fs.existsSync(indexCandidate)) {
        return `${withoutExt}/index.js`;
      }
    }
    return specifier;
  }

  const jsCandidate = path.resolve(baseDir, `${specifier}.js`);
  if (fs.existsSync(jsCandidate)) {
    return `${specifier}.js`;
  }
  const indexCandidate = path.resolve(baseDir, specifier, 'index.js');
  if (fs.existsSync(indexCandidate)) {
    return `${specifier}/index.js`;
  }
  return `${specifier}.js`;
}

function rewriteFile(filePath: string): void {
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;

  updated = updated.replace(importFromRegex, (_match, p1, p2, p3) => {
    return `${p1}${normalizeSpecifier(filePath, p2)}${p3}`;
  });

  updated = updated.replace(sideEffectImportRegex, (_match, p1, p2, p3) => {
    return `${p1}${normalizeSpecifier(filePath, p2)}${p3}`;
  });

  updated = updated.replace(dynamicImportRegex, (_match, p1, p2, p3) => {
    return `${p1}${normalizeSpecifier(filePath, p2)}${p3}`;
  });

  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
  }
}

function walk(dir: string): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      rewriteFile(entryPath);
    }
  }
}

walk(baseDir);
