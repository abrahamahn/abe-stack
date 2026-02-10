import path from 'path';

import { load } from './config/factory';

/* eslint-disable no-console */

try {
  console.log('Loading configuration...');
  const config = load();

  if (config.storage.provider !== 'local') {
    console.error('Error: Storage provider is not local');
    process.exit(1);
  }

  console.log('Storage Provider:', config.storage.provider);
  console.log('Storage Root Path:', config.storage.rootPath);

  // Expected path ends with src/apps/server/uploads
  // We check if it contains the correct segment and is absolute
  const expectedEnd = path.join('src', 'apps', 'server', 'uploads');

  if (config.storage.rootPath.endsWith(expectedEnd)) {
    console.log('SUCCESS: Storage path is correct.');
    process.exit(0);
  } else {
    console.error(
      `FAILURE: Storage path is incorrect. Expected to end with '${expectedEnd}', but got '${config.storage.rootPath}'`,
    );
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading config:', error);
  process.exit(1);
}
