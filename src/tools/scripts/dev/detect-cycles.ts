// tools/scripts/dev/detect-cycles.ts
import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('shared/src');
const files = getAllFiles(srcDir).filter((f) => f.endsWith('.ts'));

const graph: Record<string, string[]> = {};

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...getAllFiles(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

function resolveModule(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null; // Skip external
  const dir = path.dirname(fromFile);
  const absolute = path.resolve(dir, importPath);
  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
  if (fs.existsSync(absolute + '.ts')) return absolute + '.ts';
  if (fs.existsSync(path.join(absolute, 'index.ts'))) return path.join(absolute, 'index.ts');
  return null;
}

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  const importRegex = /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  const imports: string[] = [];
  while ((match = importRegex.exec(content)) !== null) {
    const resolved = resolveModule(file, match[1]);
    if (resolved) imports.push(resolved);
  }
  graph[file] = imports;
});

function findCycles(node: string, visited: Set<string>, path: string[]): string[][] {
  if (path.includes(node)) {
    const cycle = path.slice(path.indexOf(node));
    return [cycle.concat(node)];
  }
  if (visited.has(node)) return [];
  visited.add(node);

  const cycles: string[][] = [];
  for (const neighbor of graph[node] || []) {
    cycles.push(...findCycles(neighbor, visited, [...path, node]));
  }
  return cycles;
}

const allCycles: string[][] = [];
const globalVisited = new Set<string>();
for (const file of files) {
  allCycles.push(...findCycles(file, globalVisited, []));
}

if (allCycles.length > 0) {
  console.log('Found cycles:');
  allCycles.forEach((cycle) => {
    console.log(cycle.map((f) => path.relative(srcDir, f)).join(' -> '));
  });
} else {
  console.log('No cycles found.');
}
