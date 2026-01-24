// packages/core/src/env/check.ts
import fs from 'node:fs';
import path from 'node:path';
import { initEnv } from './load';

// Mock process.cwd to be the project root
// packages/core/src/env/check.ts is 4 levels deep from root
const projectRoot = path.resolve(__dirname, '../../../../');

// Helper to create temp env file
const createTempEnv = (fileName: string, content: string): string => {
  const filePath = path.join(projectRoot, fileName);
  fs.writeFileSync(filePath, content);
  return filePath;
};

// Helper to clean up
const cleanup = (files: string[]): void => {
  files.forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
};

function runTest(): void {
  console.log('--- Testing Env Loader Priority ---');

  // Setup .config/env/.env.development (lowest priority)
  const devEnvPath = path.join(projectRoot, '.config/env/.env.development');
  const originalDevEnv = fs.existsSync(devEnvPath) ? fs.readFileSync(devEnvPath, 'utf-8') : '';
  fs.writeFileSync(devEnvPath, 'TEST_VAR=development\nSHARED_VAR=development');

  // Setup .config/env/.env.local (middle priority)
  const localEnvPath = path.join(projectRoot, '.config/env/.env.local');
  fs.writeFileSync(localEnvPath, 'TEST_VAR=local');

  // Setup custom ENV_FILE (highest priority)
  const customEnvFile = 'custom.env';
  const customEnvPath = createTempEnv(customEnvFile, 'TEST_VAR=custom\nCUSTOM_ONLY=true');

  try {
    // Test 1: Standard load (should see local overwrite development)
    process.env.NODE_ENV = 'development';
    delete process.env.TEST_VAR;
    delete process.env.SHARED_VAR;

    console.log('Test 1: Standard load (.env.local > .env.development)');
    // We need to re-import or clear require cache if initEnv was stateful, but it modifies process.env
    // initEnv reads from disk.

    initEnv();

    const testVar = process.env.TEST_VAR;
    const sharedVar = process.env.SHARED_VAR;
    if (
      typeof testVar === 'string' &&
      testVar === 'local' &&
      typeof sharedVar === 'string' &&
      sharedVar === 'development'
    ) {
      console.log('✅ PASS: .env.local overrides .env.development');
    } else {
      console.error(
        '❌ FAIL: Expected local/development, got:',
        process.env.TEST_VAR,
        process.env.SHARED_VAR,
      );
    }

    // Test 2: ENV_FILE override
    console.log('\nTest 2: ENV_FILE override (ENV_FILE > .env.local)');
    process.env.ENV_FILE = customEnvPath;
    delete process.env.TEST_VAR;
    delete process.env.CUSTOM_ONLY;

    initEnv();

    const testVar2 = process.env.TEST_VAR;
    const customOnly = process.env.CUSTOM_ONLY;
    if (
      typeof testVar2 === 'string' &&
      testVar2 === 'custom' &&
      typeof customOnly === 'string' &&
      customOnly === 'true'
    ) {
      console.log('✅ PASS: ENV_FILE overrides .env.local');
    } else {
      console.error('❌ FAIL: Expected custom, got:', process.env.TEST_VAR);
    }
  } finally {
    // Restore/Cleanup
    if (originalDevEnv) {
      fs.writeFileSync(devEnvPath, originalDevEnv);
    }
    cleanup([localEnvPath, customEnvPath]);
    delete process.env.ENV_FILE;
  }
}

runTest();
