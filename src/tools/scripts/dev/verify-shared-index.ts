// tools/scripts/dev/verify-shared-index.ts
import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('shared/src/index.ts');
const content = fs.readFileSync(indexPath, 'utf-8');

// Regex to find export blocks: export [type] { ... } from './...';
const exportRegex = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;
let match;
let count = 0;

console.log('Verifying exports in', indexPath);

function resolveModulePath(dir: string, modulePath: string): string | null {
  const absolutePath = path.resolve(dir, modulePath);
  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) return absolutePath;
  if (fs.existsSync(absolutePath + '.ts')) return absolutePath + '.ts';
  const indexTs = path.join(absolutePath, 'index.ts');
  if (fs.existsSync(indexTs)) return indexTs;
  return null;
}

function itemExistsInFile(
  filePath: string,
  itemName: string,
  visited: Set<string> = new Set(),
): boolean {
  if (visited.has(filePath)) return false;
  visited.add(filePath);

  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');

  // 1. Direct export: export [type] [async] [abstract] class/const/function/interface/type Item
  const directExportRegex = new RegExp(
    `export\\s+(?:type\\s+)?(?:async\\s+)?(?:abstract\\s+)?(?:const|function|class|let|var|enum|type|namespace|interface)\\s+${itemName}\\b`,
  );
  if (directExportRegex.test(content)) return true;

  // 2. Local re-export: export [type] { A as Item } or export { Item }
  // We need to find if B is exported as Item, then check if A exists locally.
  const localReExportRegex = new RegExp(
    `export\\s+(?:type\\s+)?\\{([\\s\\S]*?)\\}(?!\\s+from)`,
    'g',
  );
  let localMatch;
  while ((localMatch = localReExportRegex.exec(content)) !== null) {
    const items = localMatch[1].split(',').map((s) => s.trim());
    for (const item of items) {
      if (item === itemName) return true; // Direct export { Item }
      if (item.includes(' as ' + itemName)) {
        const originalName = item.split(' as ')[0].trim();
        // Check if originalName exists locally (either direct or imported)
        // For simplicity, we assume if it's re-exported locally, it's there.
        return true;
      }
    }
  }

  // 3. Re-export from another module: export [type] { Item } from './module'
  // Or export { A as Item } from './module'
  const fromReExportRegex = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;
  let reExportMatch;
  while ((reExportMatch = fromReExportRegex.exec(content)) !== null) {
    const itemsStr = reExportMatch[1];
    const nextModulePath = reExportMatch[2];

    const items = itemsStr.split(',').map((s) => s.trim());
    for (const item of items) {
      let original = item;
      let exported = item;
      if (item.includes(' as ')) {
        const parts = item.split(' as ');
        original = parts[0].trim();
        exported = parts[1].trim();
      }
      if (original.startsWith('type ')) original = original.substring(5).trim();
      if (exported.startsWith('type ')) exported = exported.substring(5).trim();

      if (exported === itemName) {
        const resolvedNext = resolveModulePath(path.dirname(filePath), nextModulePath);
        if (resolvedNext && itemExistsInFile(resolvedNext, original, visited)) return true;
      }
    }
  }

  // 4. Star export: export * from './module'
  const starExportRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  let starMatch;
  while ((starMatch = starExportRegex.exec(content)) !== null) {
    const nextModulePath = starMatch[1];
    const resolvedNext = resolveModulePath(path.dirname(filePath), nextModulePath);
    if (resolvedNext && itemExistsInFile(resolvedNext, itemName, visited)) return true;
  }

  return false;
}

while ((match = exportRegex.exec(content)) !== null) {
  count++;
  const [full, itemsStr, modulePath] = match;
  const items = itemsStr
    .split(',')
    .map((s) => {
      let clean = s.trim();
      let original = clean;
      if (clean.includes(' as ')) {
        const parts = clean.split(' as ');
        original = parts[0].trim();
      }
      if (original.startsWith('type ')) original = original.substring(5).trim();
      return { original, exported: clean };
    })
    .filter(Boolean);

  const resolvedPath = resolveModulePath(path.dirname(indexPath), modulePath);
  if (!resolvedPath) {
    console.error(`❌ Module NOT FOUND: ${modulePath}`);
    continue;
  }

  for (const item of items) {
    if (!itemExistsInFile(resolvedPath, item.original)) {
      console.error(
        `❌ Export NOT FOUND in ${modulePath}: ${item.original} (exported as ${item.exported})`,
      );
    }
  }
}

console.log(`Finished verification of ${count} export blocks.`);
