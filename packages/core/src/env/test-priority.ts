// packages/core/src/env/test-priority.ts

import { initEnv, loadServerEnv } from '.';

console.log('--- Testing Environment Loader ---');

// Mock process.cwd() or manually specify config dir if needed?
// initEnv uses process.cwd() to find .config.
// We are running this script probably from root.
console.log('CWD:', process.cwd());

// We can try to load.
try {
  // Reset process.env for clean test (optional, but good)
  // But we want to see if it loads from file.

  // Let's set NODE_ENV to development
  process.env['NODE_ENV'] = 'development';

  // Call initEnv() manually to test it (though loadServerEnv calls it too)
  initEnv();

  // Check if a variable from .config/env/.env.development is present
  // I saw earlier there were .env.development files.
  // I don't know the keys, but I can print some common ones.

  console.log('NODE_ENV:', process.env['NODE_ENV']);
  console.log('DATABASE_URL:', process.env['DATABASE_URL'] ? 'SET' : 'NOT SET');
  console.log('API_PORT:', process.env['API_PORT']);

  // Now try loadServerEnv
  // Mock necessary required fields to avoid validation error if file is empty/missing key
  if (!process.env['JWT_SECRET']) process.env['JWT_SECRET'] = 'mock-secret';
  if (!process.env['SESSION_SECRET']) process.env['SESSION_SECRET'] = 'mock-session';
  if (!process.env['POSTGRES_DB']) process.env['POSTGRES_DB'] = 'testdb';
  if (!process.env['POSTGRES_USER']) process.env['POSTGRES_USER'] = 'testuser';
  if (!process.env['POSTGRES_PASSWORD']) process.env['POSTGRES_PASSWORD'] = 'testpass';

  const env = loadServerEnv();
  console.log('Validation Success!');
  console.log('PORT in env:', env.PORT);
} catch (e) {
  console.error('Test Failed:', e);
  process.exit(1);
}
