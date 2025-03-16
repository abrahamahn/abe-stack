#!/usr/bin/env node

/**
 * PERN Stack Project Structure Migration Script
 * 
 * This script manages a clean migration to the new project structure
 * by first renaming the existing server components and then creating
 * the new structure.
 * 
 * Usage:
 * 1. Save this file as migrate-structure.js in your project root
 * 2. Run: node migrate-structure.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Install dependencies first
console.log('Installing required dependencies...');
try {
  execSync('npm install --save-dev fs-extra glob', { stdio: 'inherit' });
  console.log('Dependencies installed successfully.');
} catch (error) {
  console.error('Failed to install dependencies:', error.message || 'Unknown error');
  process.exit(1);
}

// Now require the installed dependencies
const fsExtra = require('fs-extra');
const glob = require('glob');

// Define the project root and source directories
const rootDir = process.cwd();
const newSrcDir = path.join(rootDir, 'src');
let backupDir = null;

// Create backup of the project
async function createBackup() {
  console.log('\nCreating backup of your project...');
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  backupDir = `${rootDir}-backup-${timestamp}`;
  
  await fsExtra.copy(rootDir, backupDir, {
    filter: (src) => {
      return !src.includes('node_modules') && 
             !src.includes('.git') && 
             !src.includes('dist') && 
             !src.includes(backupDir);
    }
  });
  console.log(`Backup created at: ${backupDir}`);
}

// Step 1: Rename existing server folder if it exists
async function renameExistingServer() {
  const serverDir = path.join(rootDir, 'server');
  const serverBackupDir = path.join(rootDir, 'server_backup');
  
  if (fs.existsSync(serverDir)) {
    console.log('\nRenaming existing server folder to server_backup...');
    await fsExtra.move(serverDir, serverBackupDir);
    console.log('Existing server folder renamed.');
  } else {
    console.log('\nNo existing server folder found. Skipping rename step.');
  }
}

// Define the directory structure to create
const directories = [
  // Main src directory
  'src',
  
  // Server directories
  'src/server',
  'src/server/migrations',
  
  // API directories
  'src/server/api',
  'src/server/api/controllers/admin',
  'src/server/api/controllers/auth',
  'src/server/api/controllers/media',
  'src/server/api/controllers/social',
  'src/server/api/middlewares',
  'src/server/api/routes/v1',
  'src/server/api/validators/admin',
  'src/server/api/validators/auth',
  'src/server/api/validators/media',
  'src/server/api/validators/social',
  
  // Config directory
  'src/server/config',
  
  // Core directories
  'src/server/core/auth/templates',
  'src/server/core/email/templates',
  'src/server/core/logger',
  'src/server/core/queue/processors',
  'src/server/core/pubsub',
  'src/server/core/tasks',
  
  // Database directories
  'src/server/database/migrations',
  'src/server/database/repositories',
  
  // Domain directories
  'src/server/domains/admin/controllers',
  'src/server/domains/admin/dto',
  'src/server/domains/admin/models',
  'src/server/domains/admin/services',
  'src/server/domains/auth/controllers',
  'src/server/domains/auth/dto',
  'src/server/domains/auth/models',
  'src/server/domains/auth/services',
  'src/server/domains/media/albums/models',
  'src/server/domains/media/albums/services',
  'src/server/domains/media/artists/models',
  'src/server/domains/media/artists/services',
  'src/server/domains/media/playlists/models',
  'src/server/domains/media/playlists/services',
  'src/server/domains/media/tracks/models',
  'src/server/domains/media/tracks/services',
  'src/server/domains/social/comment/models',
  'src/server/domains/social/comment/services',
  'src/server/domains/social/like/models',
  'src/server/domains/social/like/services',
  'src/server/domains/social/post/models',
  'src/server/domains/social/post/services',
  'src/server/domains/social/follow/models',
  'src/server/domains/social/follow/services',
  
  // Scripts directories
  'src/server/scripts/migrations',
  'src/server/scripts/seed',
  
  // Services directories
  'src/server/services/media/processors',
  
  // Shared directories
  'src/server/shared/constants',
  'src/server/shared/errors',
  'src/server/shared/interfaces',
  'src/server/shared/types',
  'src/server/shared/utils'
];

// Create the directory structure
async function createDirectories() {
  console.log('\nCreating new directory structure...');
  
  for (const dir of directories) {
    await fsExtra.ensureDir(path.join(rootDir, dir));
    console.log(`Created: ${dir}`);
  }
}

// Define file mappings
const fileMapping = [
  // API routes
  { from: 'api/routes/v1', to: 'src/server/api/routes/v1' },
  { from: 'api/server.ts', to: 'src/server/api/server.ts' },
  
  // Config files
  { from: 'config', to: 'src/server/config' },
  
  // Database files
  { from: 'db/migrations', to: 'src/server/database/migrations' },
  { from: 'db/repositories', to: 'src/server/database/repositories' },
  { from: 'db/config.ts', to: 'src/server/database/config.ts' },
  { from: 'db/migrationConfig.ts', to: 'src/server/database/config.ts' },
  { from: 'db/migrationManager.ts', to: 'src/server/database/migration.manager.ts' },
  { from: 'db/transactionManager.ts', to: 'src/server/database/transaction.manager.ts' },
  
  // Root files
  { from: 'api.ts', to: 'src/server/api.ts' },
  { from: 'ApiServer.ts', to: 'src/server/api/server.ts' },
  { from: 'FileServer.ts', to: 'src/server/services/file.server.ts' },
  { from: 'index.ts', to: 'src/server/index.ts' },
  { from: 'PubsubServer.ts', to: 'src/server/core/pubsub/pubsub.server.ts' },
  { from: 'QueueServer.ts', to: 'src/server/core/queue/queue.server.ts' },
  { from: 'server.ts', to: 'src/server/server.ts' },
  { from: 'tasks.ts', to: 'src/server/tasks.ts' },
  { from: 'types.ts', to: 'src/server/shared/types/index.ts' },
  
  // Domains
  { from: 'domains/admin', to: 'src/server/domains/admin' },
  { from: 'domains/auth', to: 'src/server/domains/auth' },
  { from: 'domains/media', to: 'src/server/domains/media' },
  { from: 'domains/social', to: 'src/server/domains/social' },
  
  // Scripts
  { from: 'scripts', to: 'src/server/scripts' },
  
  // Services
  { from: 'services', to: 'src/server/services' },
  
  // Shared
  { from: 'shared/errors', to: 'src/server/shared/errors' },
  { from: 'shared/helpers', to: 'src/server/shared/utils' },
  { from: 'shared/lib', to: 'src/server/shared/utils' },
  { from: 'shared/middleware', to: 'src/server/api/middlewares' },
  { from: 'shared/tasks', to: 'src/server/core/tasks' },
  { from: 'shared/types', to: 'src/server/shared/types' },
  { from: 'shared/utils', to: 'src/server/shared/utils' },
];

// Copy files according to the mapping
async function copyFiles() {
  console.log('\nCopying files to their new locations...');
  let filesCopied = 0;
  
  for (const mapping of fileMapping) {
    const sourcePath = path.join(rootDir, mapping.from);
    const targetPath = path.join(rootDir, mapping.to);
    
    if (fs.existsSync(sourcePath)) {
      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        // Copy the contents of the directory
        try {
          await fsExtra.copy(sourcePath, targetPath);
          filesCopied++;
          console.log(`Copied directory: ${mapping.from} -> ${mapping.to}`);
        } catch (error) {
          console.error(`Error copying directory ${mapping.from}:`, error.message || 'Unknown error');
        }
      } else if (stats.isFile()) {
        // Copy the file
        try {
          await fsExtra.ensureDir(path.dirname(targetPath));
          await fsExtra.copy(sourcePath, targetPath);
          filesCopied++;
          console.log(`Copied file: ${mapping.from} -> ${mapping.to}`);
        } catch (error) {
          console.error(`Error copying file ${mapping.from}:`, error.message || 'Unknown error');
        }
      }
    } else {
      // console.log(`Source does not exist: ${mapping.from} (skipping)`);
    }
  }
  
  console.log(`\nTotal files and directories copied: ${filesCopied}`);
}

// Create a src/index.ts entry point
async function createMainIndex() {
  console.log('\nCreating main entry point at src/index.ts...');
  
  const mainIndexContent = `// Main application entry point
import './server/server';

// You can add any additional client-side imports here
`;

  try {
    await fsExtra.writeFile(path.join(rootDir, 'src/index.ts'), mainIndexContent);
    console.log('Created main entry point at src/index.ts');
  } catch (error) {
    console.error('Error creating main entry point:', error.message || 'Unknown error');
  }
}

// Create basic index.ts files
async function createIndexFiles() {
  console.log('\nCreating index.ts files...');
  
  for (const dir of directories) {
    if (dir === 'src') continue; // Skip the root src directory
    
    const indexPath = path.join(rootDir, dir, 'index.ts');
    
    if (!fs.existsSync(indexPath)) {
      try {
        await fsExtra.writeFile(indexPath, '// Auto-generated index file\n\n');
        console.log(`Created index file: ${dir}/index.ts`);
      } catch (error) {
        console.error(`Error creating index file for ${dir}:`, error.message || 'Unknown error');
      }
    }
  }
}

// Main function to run the migration
async function main() {
  try {
    console.log('=== Starting PERN Stack Project Migration ===\n');
    
    // Step 1: Create a backup
    await createBackup();
    
    // Step 2: Rename the existing server folder if it exists
    await renameExistingServer();
    
    // Step 3: Create the new directory structure
    await createDirectories();
    
    // Step 4: Copy files to their new locations
    await copyFiles();
    
    // Step 5: Create index.ts files
    await createIndexFiles();
    
    // Step 6: Create the main entry point
    await createMainIndex();
    
    // Step 7: Provide completion message
    console.log('\n=== Migration Complete ===');
    console.log('\nNEXT STEPS:');
    console.log('1. Update your package.json entry points:');
    console.log('   "main": "src/index.ts"');
    console.log('   "scripts": {');
    console.log('     "start": "ts-node src/index.ts",');
    console.log('     "dev": "nodemon --watch \'src/**/*.ts\' --exec ts-node src/index.ts"');
    console.log('   }');
    console.log('\n2. Update your tsconfig.json:');
    console.log('   "include": ["src/**/*"]');
    console.log('\n3. Test your application to ensure everything works.');
    console.log('\n4. Once verified, you can safely delete the original files and server_backup folder.');
    
    if (backupDir) {
      console.log(`\nA backup of your project was created at: ${backupDir}`);
      console.log('You can restore from this backup if needed.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error.message || 'Unknown error');
    if (backupDir) {
      console.log(`You can restore your project from the backup at: ${backupDir}`);
    }
    process.exit(1);
  }
}

// Execute the script
main();