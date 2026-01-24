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

async function exportServerConfig(): Promise<void> {
  try {
    const rootDir = path.join(__dirname, '..', '..', '..'); // tooling/scripts/export -> repo root

    // Three main config directories
    const serverConfigDir = path.join(rootDir, 'apps', 'server', 'src', 'config');
    const coreConfigDir = path.join(rootDir, 'packages', 'core', 'src', 'config');
    const configEnvDir = path.join(rootDir, '.config', 'env');

    const outputFile = path.join(rootDir, 'server-config-export.txt');

    // Helper to list all files (including tests and READMEs)
    const listAllFiles = async (dir: string): Promise<string[]> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: string[] = [];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...(await listAllFiles(fullPath)));
          } else if (entry.isFile()) {
            // Include .ts, .test.ts, .md files
            if (
              entry.name.endsWith('.ts') ||
              entry.name.endsWith('.md') ||
              entry.name.startsWith('.env')
            ) {
              files.push(fullPath);
            }
          }
        }

        return files;
      } catch {
        return [];
      }
    };

    // Collect all files from the three directories
    const allFiles = [
      ...(await listAllFiles(configEnvDir)),
      ...(await listAllFiles(coreConfigDir)),
      ...(await listAllFiles(serverConfigDir)),
    ].sort((a, b) => a.localeCompare(b));

    let combinedContent = '';
    combinedContent += '// ===== ABE STACK - CONFIGURATION SYSTEM EXPORT =====\n';
    combinedContent += `// Generated: ${new Date().toISOString()}\n`;
    combinedContent += `// Total files: ${String(allFiles.length)}\n`;
    combinedContent += '//\n';
    combinedContent += '// This export includes:\n';
    combinedContent += '// - .config/env/* (environment files)\n';
    combinedContent += '// - packages/core/src/config/* (core config system)\n';
    combinedContent += '// - apps/server/src/config/* (server config)\n';
    combinedContent += '// - All .ts, .test.ts, and .md files\n';
    combinedContent += '// ===================================================\n';

    // Process each file
    for (const file of allFiles) {
      const content = await fs.readFile(file, 'utf8');
      const relativePath = path.relative(rootDir, file);

      // Add a header for each file
      combinedContent += `\n\n// ===== START OF ${relativePath} =====\n\n`;
      combinedContent += content.trimEnd();
      combinedContent += `\n\n// ===== END OF ${relativePath} =====\n`;
    }

    // Write the combined content to the output file
    await fs.writeFile(outputFile, combinedContent.trim());

    console.log(
      `✅ Successfully exported ${String(allFiles.length)} config files to ${outputFile}`,
    );
    console.log('\n📁 Directories included:');
    console.log('   - .config/env/');
    console.log('   - packages/core/src/config/');
    console.log('   - apps/server/src/config/');
    console.log('\n📄 File types: .ts, .test.ts, .md, .env*');
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
