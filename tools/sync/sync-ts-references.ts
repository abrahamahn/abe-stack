// tools/sync/sync-ts-references.ts

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const TSCONFIG_PATH = path.join(ROOT, 'tsconfig.json');
const SCAN_DIRS = ['apps', 'packages'];

interface ProjectReference {
  path: string;
}



function findProjects(dir: string): string[] {
    const results: string[] = [];
    const fullPath = path.join(ROOT, dir);

    if (!fs.existsSync(fullPath)) return [];

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const projectPath = path.join(fullPath, entry.name);
            const tsconfigPath = path.join(projectPath, 'tsconfig.json');

            if (fs.existsSync(tsconfigPath)) {
                results.push(`./${dir}/${entry.name}`);
            }
        }
    }
    return results;
}

interface TsConfig {
  references?: ProjectReference[];
  [key: string]: unknown;
}

function main(): void {
    console.log('🔄 Syncing TypeScript Project References...');

    // 1. Scan for projects
    const projects: string[] = [];
    for (const dir of SCAN_DIRS) {
        projects.push(...findProjects(dir));
    }

    projects.sort();

    // 2. Read root tsconfig
    let tsconfig: TsConfig;
    try {
        const content = fs.readFileSync(TSCONFIG_PATH, 'utf-8');
        // Simple JSON parse (comments might break this if present, but strict JSON is expected)
        // If comments exist, we need a lenient parser or regex.
        // For this controlled env, let's assume valid JSON or strip comments.
        const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').trim();
        tsconfig = JSON.parse(cleanContent) as TsConfig;
    } catch (e) {
        console.error('Failed to parse root tsconfig.json', e);
        process.exit(1);
    }

    // 3. Update references
    const currentRefs: ProjectReference[] = tsconfig.references ?? [];
    const newRefs: ProjectReference[] = projects.map(p => ({ path: p }));

    // Check if changes are needed
    const currentPaths = new Set(currentRefs.map(r => r.path));
    const newPaths = new Set(newRefs.map(r => r.path));

    const needsUpdate = currentPaths.size !== newPaths.size ||
                        [...newPaths].some(p => !currentPaths.has(p));

    if (needsUpdate) {
        console.log(`Found ${projects.length} projects.`);
        // Preserve comments/formatting by reading original file line-by-line or using a formatter?
        // Simpler approach: update the object and write back with formatting.
        // WARNING: This strips comments. If root tsconfig has comments, we lose them.
        // We know standard JSON.stringify kills comments.
        // Given we just merged base (with comments) into root, we HAVE comments.
        // We probably shouldn't blindly overwrite using JSON.stringify.

        // Strategy: Use regex to replace the references block content strictly.

        const rawContent = fs.readFileSync(TSCONFIG_PATH, 'utf-8');
        const refsString = JSON.stringify(newRefs, null, 4)
             .split('\n')
             .map((line, i) => i === 0 ? line : '    ' + line) // Indent
             .join('\n');

        // Regex to match "references": [ ... ]
        // Match "references": and then everything until the closing bracket matching the opening one.
        // Simple heuristic: "references":\s*\[([\s\S]*?)\]
        const updatedContent = rawContent.replace(/"references":\s*\[[\s\S]*?\]/, `"references": ${refsString}`);

        fs.writeFileSync(TSCONFIG_PATH, updatedContent);
        console.log('✅ Updated references in tsconfig.json');
    } else {
        console.log('✓ References are already up to date.');
    }
}

main();
