// tools/export/export-server-config.ts
/**
 * Export all server configuration files to a single text file
 * This script reads all configuration files from the server config folder
 * and combines them into a single text file in the root directory
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function listTypeScriptFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function exportServerConfig(): Promise<void> {
  try {
    const rootDir = path.join(__dirname, '..', '..', '..'); // tooling/scripts/export -> repo root
    const serverConfigDir = path.join(rootDir, 'apps', 'server', 'src', 'config');
    const coreConfigDir = path.join(rootDir, 'packages', 'core', 'src', 'config');
    const coreEnvDir = path.join(rootDir, 'packages', 'core', 'src', 'env');
    const coreContractsConfigDir = path.join(
      rootDir,
      'packages',
      'core',
      'src',
      'contracts',
      'config',
    );
    const configEnvDir = path.join(rootDir, '.config', 'env');
    const envExamplePath = path.join(rootDir, '.env.example');

    const outputFile = path.join(rootDir, 'server-config-export.txt');

    // Helper to list non-ts files if needed, or just reuse listTypeScriptFiles for TS
    // For .config/env, we want all files (usually start with .env)
    const listEnvFiles = async (dir: string): Promise<string[]> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        return entries.filter((e) => e.isFile()).map((e) => path.join(dir, e.name));
      } catch {
        return [];
      }
    };

    const tsFiles = [
      ...(await listTypeScriptFiles(serverConfigDir)),
      ...(await listTypeScriptFiles(coreConfigDir)),
      ...(await listTypeScriptFiles(coreEnvDir)),
      ...(await listTypeScriptFiles(coreContractsConfigDir)),
    ];

    // Add raw env files
    const envFiles = await listEnvFiles(configEnvDir);

    const allFiles = [...tsFiles, ...envFiles].sort((a, b) => a.localeCompare(b));

    let combinedContent = '';

    // Include .env.example for reference
    try {
      const envExample = await fs.readFile(envExamplePath, 'utf8');
      combinedContent += `// ===== START OF ${path.relative(rootDir, envExamplePath)} =====\n\n`;
      combinedContent += envExample.trimEnd();
      combinedContent += `\n\n// ===== END OF ${path.relative(rootDir, envExamplePath)} =====\n`;
    } catch {
      // Skip if .env.example is missing
    }

    // Process each file
    for (const file of allFiles) {
      const content = await fs.readFile(file, 'utf8');
      const relativePath = path.relative(rootDir, file);

      // Add a header for each file
      combinedContent += `\n\n// ===== START OF ${relativePath} =====\n\n`;
      combinedContent += content;
      combinedContent += `\n\n// ===== END OF ${relativePath} =====\n`;
    }

    // Write the combined content to the output file
    await fs.writeFile(outputFile, combinedContent.trim());

    console.log(`Successfully exported ${String(allFiles.length)} config files to ${outputFile}`);
    console.log(
      `Files included: ${allFiles.map((file) => path.relative(rootDir, file)).join(', ')}`,
    );
  } catch (error: unknown) {
    console.error('Error exporting server config:', error);
    throw error;
  }
}

// Run the export if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  exportServerConfig()
    .then(() => {
      console.log('Server config export completed successfully!');
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error('Failed to export server config:', error);
      process.exit(1);
    });
}

export { exportServerConfig };
