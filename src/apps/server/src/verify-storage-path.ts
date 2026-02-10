// src/apps/server/src/verify-storage-path.ts
import path from 'path';

import { load } from './config/factory';

function writeOut(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

function writeErr(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

try {
  writeOut('Loading configuration...');
  const config = load();

  if (config.storage.provider !== 'local') {
    writeErr('Error: Storage provider is not local');
    process.exit(1);
  }

  writeOut(`Storage Provider: ${config.storage.provider}`);
  writeOut(`Storage Root Path: ${config.storage.rootPath}`);

  // Expected path ends with src/apps/server/uploads
  // We check if it contains the correct segment and is absolute
  const expectedEnd = path.join('src', 'apps', 'server', 'uploads');

  if (config.storage.rootPath.endsWith(expectedEnd)) {
    writeOut('SUCCESS: Storage path is correct.');
    process.exit(0);
  } else {
    writeErr(
      `FAILURE: Storage path is incorrect. Expected to end with '${expectedEnd}', but got '${config.storage.rootPath}'`,
    );
    process.exit(1);
  }
} catch (error) {
  writeErr(`Error loading config: ${String(error)}`);
  process.exit(1);
}
