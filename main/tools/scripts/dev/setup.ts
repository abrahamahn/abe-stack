// main/tools/scripts/dev/setup.ts
/**
 * BSLT Interactive Setup Script
 *
 * Sets up a fresh clone of the repository with:
 * - Setup presets for different use cases
 * - Package manager selection and dependency installation
 * - Interactive environment file configuration
 * - Optional Docker database setup
 * - Database schema and seed data
 *
 * Presets:
 * - Quick Start: Zero external dependencies, uses JSON file database
 * - Docker Dev: PostgreSQL in Docker, console email
 * - Custom: Configure each service individually
 *
 * Usage: pnpm setup
 */

import { execSync, spawnSync } from 'child_process';
import { randomFillSync } from 'crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'fs';
import { dirname, resolve } from 'path';
import { createInterface } from 'readline';

// =============================================================================
// Types
// =============================================================================

type SetupPreset = 'quick' | 'docker' | 'custom';
type PackageManager = 'pnpm' | 'npm' | 'yarn';
type DatabaseProvider = 'postgresql' | 'json';
type StorageProvider = 'local' | 's3';
type EmailProvider = 'console' | 'smtp';

interface SetupOptions {
  preset: SetupPreset;
  packageManager: PackageManager;
  skipInstall: boolean;
}

interface EnvConfig {
  // Database
  databaseProvider: DatabaseProvider;
  postgresHost: string;
  postgresPort: string;
  postgresUser: string;
  postgresPassword: string;
  postgresDb: string;
  jsonDbPath: string;

  // App
  nodeEnv: string;
  appPort: string;
  apiPort: string;

  // Frontend
  viteApiUrl: string;
  viteAppName: string;

  // Security
  jwtSecret: string;
  sessionSecret: string;

  // Storage
  storageProvider: StorageProvider;
  storageLocalPath: string;
  storageLocalPublicUrl: string;

  // Email
  emailProvider: EmailProvider;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  emailFromName: string;
  emailFromAddress: string;
}

// =============================================================================
// Constants
// =============================================================================

const ROOT = process.cwd();
const ENV_DEV = resolve(ROOT, 'config/env/.env.development');
const DOCKER_COMPOSE = resolve(ROOT, 'config/docker/docker-compose.yml');
const JSON_DB_DIR = resolve(ROOT, '.data');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Default configuration for Quick Start preset (zero external dependencies)
const QUICK_START_ENV: EnvConfig = {
  databaseProvider: 'json',
  postgresHost: 'localhost',
  postgresPort: '5432',
  postgresUser: 'postgres',
  postgresPassword: 'postgres',
  postgresDb: 'abe_stack_dev',
  jsonDbPath: '.data/db.json',
  nodeEnv: 'development',
  appPort: '3000',
  apiPort: '8080',
  viteApiUrl: 'http://localhost:8080',
  viteAppName: 'bslt-web',
  jwtSecret: '',
  sessionSecret: '',
  storageProvider: 'local',
  storageLocalPath: './uploads',
  storageLocalPublicUrl: 'http://localhost:8080/uploads',
  emailProvider: 'console',
  smtpHost: '',
  smtpPort: '587',
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  emailFromName: 'BSLT',
  emailFromAddress: 'noreply@example.com',
};

// Default configuration for Docker Dev preset
const DOCKER_DEV_ENV: EnvConfig = {
  ...QUICK_START_ENV,
  databaseProvider: 'postgresql',
};

// =============================================================================
// Utilities
// =============================================================================

function color(text: string, c: keyof typeof COLORS): string {
  return `${COLORS[c]}${text}${COLORS.reset}`;
}

function log(message: string): void {
  console.log(message);
}

function logStep(step: number, total: number, message: string): void {
  log(`\n${color(`[${String(step)}/${String(total)}]`, 'cyan')} ${color(message, 'bright')}`);
}

function logSuccess(message: string): void {
  log(`${color('✓', 'green')} ${message}`);
}

function logWarning(message: string): void {
  log(`${color('⚠', 'yellow')} ${message}`);
}

function logError(message: string): void {
  log(`${color('✗', 'red')} ${message}`);
}

function logInfo(message: string): void {
  log(`${color('ℹ', 'blue')} ${message}`);
}

// =============================================================================
// Interactive Prompts
// =============================================================================

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function promptWithDefault(question: string, defaultValue: string): Promise<string> {
  const hint = defaultValue ? color(` [${defaultValue}]`, 'dim') : '';
  const answer = await prompt(`${question}${hint}: `);
  return answer || defaultValue;
}

async function promptPassword(question: string, defaultValue: string): Promise<string> {
  const hint = defaultValue ? color(` [****]`, 'dim') : '';
  const answer = await prompt(`${question}${hint}: `);
  return answer || defaultValue;
}

async function promptChoice<T extends string>(
  question: string,
  choices: { key: string; label: string; value: T; description?: string }[],
  defaultKey?: string,
): Promise<T> {
  log('');
  log(color(question, 'bright'));
  for (const choice of choices) {
    const isDefault = choice.key === defaultKey;
    const prefix = isDefault ? color('→', 'green') : ' ';
    const suffix = isDefault ? color(' (recommended)', 'dim') : '';
    log(`  ${prefix} ${color(choice.key, 'cyan')}) ${choice.label}${suffix}`);
    if (choice.description) {
      log(`     ${color(choice.description, 'dim')}`);
    }
  }

  const defaultHint = defaultKey ? ` [${defaultKey}]` : '';
  const answer = await prompt(`\nYour choice${defaultHint}: `);

  const selected = answer || defaultKey;
  const choice = choices.find((c) => c.key === selected);

  if (!choice) {
    logWarning(`Invalid choice. Using default: ${defaultKey ?? '1'}`);
    const fallback = choices.find((c) => c.key === defaultKey) ?? choices[0];
    return fallback?.value as T;
  }

  return choice.value;
}

async function promptYesNo(question: string, defaultValue: boolean): Promise<boolean> {
  const hint = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${question} ${hint}: `);

  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

// =============================================================================
// Command Execution
// =============================================================================

function run(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; silent?: boolean },
): boolean {
  const { cwd, env, silent } = options ?? {};

  if (!silent) {
    log(color(`> ${command} ${args.join(' ')}`, 'dim'));
  }

  const result = spawnSync(command, args, {
    stdio: silent ? 'pipe' : 'inherit',
    cwd: cwd ?? ROOT,
    env: { ...process.env, ...env },
  });

  return result.status === 0;
}

function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Setup Steps
// =============================================================================

function printBanner(): void {
  log('');
  log(color('╔════════════════════════════════════════════════════════════════╗', 'cyan'));
  log(
    color('║', 'cyan') +
      color('                    ABE STACK SETUP                            ', 'bright') +
      color('║', 'cyan'),
  );
  log(
    color('║', 'cyan') +
      color('         Interactive Development Environment Setup             ', 'dim') +
      color('║', 'cyan'),
  );
  log(color('╚════════════════════════════════════════════════════════════════╝', 'cyan'));
  log('');
}

async function selectPreset(): Promise<SetupPreset> {
  log('Choose a setup preset to get started quickly, or customize everything.');
  log('');

  return promptChoice<SetupPreset>(
    'Select setup preset:',
    [
      {
        key: '1',
        label: 'Quick Start',
        value: 'quick',
        description: 'Zero external dependencies - uses JSON file database, console email',
      },
      {
        key: '2',
        label: 'Docker Development',
        value: 'docker',
        description: 'PostgreSQL in Docker, console email - recommended for full development',
      },
      {
        key: '3',
        label: 'Custom Setup',
        value: 'custom',
        description: 'Configure each service individually',
      },
    ],
    '1',
  );
}

async function gatherOptions(preset: SetupPreset): Promise<SetupOptions> {
  // Check if dependencies are already installed
  const nodeModulesExists = existsSync(resolve(ROOT, 'node_modules'));
  let skipInstall = false;

  if (nodeModulesExists) {
    skipInstall = await promptYesNo('Dependencies already installed. Skip install step?', true);
  }

  // Package manager selection
  const packageManager = await promptChoice<PackageManager>(
    'Which package manager would you like to use?',
    [
      { key: '1', label: 'pnpm (fast, efficient)', value: 'pnpm' },
      { key: '2', label: 'npm (default Node.js)', value: 'npm' },
      { key: '3', label: 'yarn (classic)', value: 'yarn' },
    ],
    '1',
  );

  // Check if selected package manager exists
  if (!commandExists(packageManager)) {
    logError(`${packageManager} is not installed.`);
    if (packageManager === 'pnpm') {
      logInfo('Install pnpm with: npm install -g pnpm');
    }
    process.exit(1);
  }

  return {
    preset,
    packageManager,
    skipInstall,
  };
}

function getPresetConfig(preset: SetupPreset): EnvConfig {
  const config = preset === 'quick' ? { ...QUICK_START_ENV } : { ...DOCKER_DEV_ENV };

  // Generate secrets
  config.jwtSecret = generateRandomSecret();
  config.sessionSecret = generateRandomSecret();

  return config;
}

async function gatherCustomEnvConfig(): Promise<EnvConfig> {
  const config = { ...DOCKER_DEV_ENV };

  // Database provider selection
  log('');
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
  log(color('                    DATABASE CONFIGURATION', 'bright'));
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));

  config.databaseProvider = await promptChoice<DatabaseProvider>(
    'Database provider:',
    [
      {
        key: '1',
        label: 'PostgreSQL',
        value: 'postgresql',
        description: 'Production-ready relational database',
      },
      {
        key: '2',
        label: 'JSON File',
        value: 'json',
        description: 'Simple file-based storage for quick prototyping',
      },
    ],
    '1',
  );

  if (config.databaseProvider === 'postgresql') {
    const useDocker = commandExists('docker')
      ? await promptYesNo('Use Docker for PostgreSQL?', true)
      : false;

    if (!useDocker) {
      config.postgresHost = await promptWithDefault('PostgreSQL host', config.postgresHost);
      config.postgresPort = await promptWithDefault('PostgreSQL port', config.postgresPort);
      config.postgresUser = await promptWithDefault('PostgreSQL user', config.postgresUser);
      config.postgresPassword = await promptPassword(
        'PostgreSQL password',
        config.postgresPassword,
      );
      config.postgresDb = await promptWithDefault('PostgreSQL database name', config.postgresDb);
    }
  } else {
    config.jsonDbPath = await promptWithDefault('JSON database file path', config.jsonDbPath);
  }

  // Application ports
  log('');
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
  log(color('                    APPLICATION PORTS', 'bright'));
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));

  config.apiPort = await promptWithDefault('API server port', config.apiPort);
  config.viteApiUrl = `http://localhost:${config.apiPort}`;

  // Email provider
  log('');
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
  log(color('                    EMAIL CONFIGURATION', 'bright'));
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));

  config.emailProvider = await promptChoice<EmailProvider>(
    'Email provider:',
    [
      {
        key: '1',
        label: 'Console (Mock)',
        value: 'console',
        description: 'Logs emails to console - perfect for development',
      },
      {
        key: '2',
        label: 'SMTP',
        value: 'smtp',
        description: 'Send real emails via SMTP server',
      },
    ],
    '1',
  );

  if (config.emailProvider === 'smtp') {
    config.smtpHost = await promptWithDefault('SMTP host', config.smtpHost);
    config.smtpPort = await promptWithDefault('SMTP port', config.smtpPort);
    config.smtpSecure = await promptYesNo('Use TLS/SSL?', config.smtpPort === '465');
    config.smtpUser = await promptWithDefault('SMTP username', config.smtpUser);
    config.smtpPassword = await promptPassword('SMTP password', config.smtpPassword);
    config.emailFromAddress = await promptWithDefault(
      'From email address',
      config.emailFromAddress,
    );
  }

  // Storage
  log('');
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
  log(color('                    FILE STORAGE', 'bright'));
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));

  config.storageProvider = await promptChoice<StorageProvider>(
    'File storage provider:',
    [
      { key: '1', label: 'Local filesystem', value: 'local' },
      { key: '2', label: 'Amazon S3 / S3-compatible', value: 's3' },
    ],
    '1',
  );

  if (config.storageProvider === 'local') {
    config.storageLocalPath = await promptWithDefault(
      'Local storage path',
      config.storageLocalPath,
    );
    config.storageLocalPublicUrl = `http://localhost:${config.apiPort}/uploads`;
  }

  // Security secrets
  log('');
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
  log(color('                    SECURITY SECRETS', 'bright'));
  log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));

  const generateSecrets = await promptYesNo('Generate secure random secrets automatically?', true);

  if (generateSecrets) {
    config.jwtSecret = generateRandomSecret();
    config.sessionSecret = generateRandomSecret();
    logSuccess('Generated secure random secrets');
  } else {
    logInfo('Enter your own secrets (minimum 32 characters recommended)');
    config.jwtSecret = await promptWithDefault('JWT secret', generateRandomSecret());
    config.sessionSecret = await promptWithDefault('Session secret', generateRandomSecret());
  }

  return config;
}

function generateEnvFileContent(config: EnvConfig): string {
  const dbSection =
    config.databaseProvider === 'postgresql'
      ? `# =============================================================================
# DATABASE (PostgreSQL)
# =============================================================================
DATABASE_PROVIDER=postgresql
POSTGRES_HOST=${config.postgresHost}
POSTGRES_PORT=${config.postgresPort}
POSTGRES_USER=${config.postgresUser}
POSTGRES_PASSWORD=${config.postgresPassword}
POSTGRES_DB=${config.postgresDb}

# Connection pool settings (optional)
# DB_MAX_CONNECTIONS=10
# DB_IDLE_TIMEOUT=30000
# DB_CONNECT_TIMEOUT=10000`
      : `# =============================================================================
# DATABASE (JSON File)
# =============================================================================
DATABASE_PROVIDER=json
JSON_DB_PATH=${config.jsonDbPath}

# Note: JSON database is for development/prototyping only.
# Use PostgreSQL for production workloads.`;

  const emailSection =
    config.emailProvider === 'smtp'
      ? `# =============================================================================
# EMAIL (SMTP)
# =============================================================================
EMAIL_PROVIDER=smtp
SMTP_HOST=${config.smtpHost}
SMTP_PORT=${config.smtpPort}
SMTP_SECURE=${String(config.smtpSecure)}
SMTP_USER=${config.smtpUser}
SMTP_PASS=${config.smtpPassword}
EMAIL_FROM_NAME=${config.emailFromName}
EMAIL_FROM_ADDRESS=${config.emailFromAddress}`
      : `# =============================================================================
# EMAIL (Console Mock)
# =============================================================================
EMAIL_PROVIDER=console

# Note: Emails will be logged to console. Configure SMTP for production.
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# EMAIL_FROM_ADDRESS=noreply@example.com`;

  return `# =============================================================================
# ABE STACK - Development Environment Configuration
# Generated by setup script on ${new Date().toISOString()}
# =============================================================================

${dbSection}

# =============================================================================
# APPLICATION
# =============================================================================
NODE_ENV=${config.nodeEnv}
APP_PORT=${config.appPort}
API_PORT=${config.apiPort}

# =============================================================================
# FRONTEND (Vite)
# =============================================================================
VITE_API_URL=${config.viteApiUrl}
VITE_APP_NAME=${config.viteAppName}

# =============================================================================
# SECURITY & AUTH
# =============================================================================
JWT_SECRET=${config.jwtSecret}
SESSION_SECRET=${config.sessionSecret}

# Access token expiry (default: 15m)
# JWT_ACCESS_EXPIRY=15m

# Refresh token expiry in days (default: 7)
# REFRESH_TOKEN_EXPIRY_DAYS=7

# Account lockout settings
# LOCKOUT_MAX_ATTEMPTS=10
# LOCKOUT_DURATION_MS=1800000

${emailSection}

# =============================================================================
# STORAGE
# =============================================================================
STORAGE_PROVIDER=${config.storageProvider}

# Local storage settings
STORAGE_LOCAL_PATH=${config.storageLocalPath}
STORAGE_LOCAL_PUBLIC_URL=${config.storageLocalPublicUrl}

# S3 storage settings (uncomment if using S3)
# S3_BUCKET=my-bucket
# S3_REGION=us-east-1
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_ENDPOINT=
# S3_FORCE_PATH_STYLE=false
# S3_PRESIGN_EXPIRES_SECONDS=3600

# =============================================================================
# EXTERNAL SERVICES (Optional)
# =============================================================================
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=

# =============================================================================
# DEVELOPMENT TOOLS
# =============================================================================
# DEBUG=true
# DRIZZLE_STUDIO_PORT=4983
`;
}

function generateRandomSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(48);
  randomFillSync(randomValues);
  for (const byte of randomValues) {
    const char = chars[byte % chars.length];
    if (char !== undefined) {
      result += char;
    }
  }
  return result;
}

function parseEnvFile(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=:#]+?)[=:](.*)/);
      if (match) {
        const key = match[1]?.trim();
        const value = match[2]?.trim().replace(/^['"](.*)['"]$/, '$1') ?? '';
        if (key) env[key] = value;
      }
    }
    return env;
  } catch {
    return {};
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeFileAtomic(targetPath: string, content: string): void {
  const directory = dirname(targetPath);
  const suffixBytes = new Uint8Array(4);
  randomFillSync(suffixBytes);
  const suffixHex = Buffer.from(suffixBytes).toString('hex');
  const tempPath = resolve(directory, `.tmp-${process.pid}-${suffixHex}.env`);
  // Use openSync with mode to set permissions atomically (no brief window with default perms)
  const fd = openSync(tempPath, 'w', 0o600);
  try {
    writeSync(fd, content);
  } finally {
    closeSync(fd);
  }
  renameSync(tempPath, targetPath);
}

// =============================================================================
// Installation Steps
// =============================================================================

function getStepCount(config: EnvConfig): number {
  // Steps: install, env, (docker?), (schema?), (seed?), generators
  if (config.databaseProvider === 'postgresql') {
    return 6; // install, env, docker, schema, seed, generators
  }
  return 3; // install, env, generators (no db steps for JSON)
}

function installDependencies(pm: PackageManager, step: number, total: number): void {
  logStep(step, total, 'Installing dependencies...');

  const installCmd = pm === 'yarn' ? 'yarn' : pm;
  const installArgs = pm === 'yarn' ? [] : ['install'];

  if (!run(installCmd, installArgs)) {
    logError('Failed to install dependencies');
    process.exit(1);
  }

  logSuccess('Dependencies installed');
}

async function setupEnvironment(envConfig: EnvConfig, step: number, total: number): Promise<void> {
  logStep(step, total, 'Creating environment file...');

  // Check if config/env/.env.development already exists
  if (existsSync(ENV_DEV)) {
    const overwrite = await promptYesNo(
      'config/env/.env.development already exists. Overwrite with new configuration?',
      false,
    );
    if (!overwrite) {
      logInfo('Keeping existing config/env/.env.development');
      return;
    }
  }

  // Create .data directory for JSON database if needed (recursive is idempotent)
  if (envConfig.databaseProvider === 'json') {
    mkdirSync(JSON_DB_DIR, { recursive: true });
    logSuccess('Created .data directory for JSON database');
  }

  const content = generateEnvFileContent(envConfig);
  writeFileAtomic(ENV_DEV, content);
  logSuccess('Created config/env/.env.development with your configuration');
}

async function setupDocker(envConfig: EnvConfig, step: number, total: number): Promise<void> {
  logStep(step, total, 'Starting Docker containers...');

  // Update docker compose env vars
  const envVars = {
    POSTGRES_USER: envConfig.postgresUser,
    POSTGRES_PASSWORD: envConfig.postgresPassword,
    POSTGRES_DB: envConfig.postgresDb,
    POSTGRES_PORT: envConfig.postgresPort,
  };

  // Start docker compose
  if (
    !run('docker', ['compose', '-f', DOCKER_COMPOSE, '--env-file', ENV_DEV, 'up', '-d'], {
      env: envVars,
    })
  ) {
    logError('Failed to start Docker containers');
    logInfo('Try running: docker compose -f config/docker/docker-compose.yml up -d');
    process.exit(1);
  }

  logSuccess('Docker containers started');

  // Wait for database health
  log('\n⏳ Waiting for database to be ready...');

  let retries = 30;
  let healthy = false;

  while (retries > 0) {
    const result = spawnSync(
      'docker',
      ['inspect', '--format', '{{.State.Health.Status}}', 'bslt-postgres'],
      { stdio: 'pipe' },
    );

    const status = result.stdout.toString().trim();
    if (status === 'healthy') {
      healthy = true;
      break;
    }

    process.stdout.write('.');
    await sleep(1000);
    retries--;
  }

  log('');

  if (!healthy) {
    logError('Database failed to become healthy');
    logInfo('Check logs with: docker compose logs postgres');
    process.exit(1);
  }

  logSuccess('Database is ready');
}

function skipDockerStep(step: number, total: number): void {
  logStep(step, total, 'Skipping Docker setup...');
  logWarning('Make sure your PostgreSQL database is running and accessible');
  logInfo('The connection will use the settings from config/env/.env.development');
}

function pushDatabaseSchema(pm: PackageManager, step: number, total: number): void {
  logStep(step, total, 'Pushing database schema...');

  const envVars = parseEnvFile(ENV_DEV);

  if (!run(pm, ['--filter', '@bslt/server', 'db:push'], { env: envVars })) {
    logError('Failed to push database schema');
    process.exit(1);
  }

  logSuccess('Database schema created');
}

function seedDatabase(pm: PackageManager, step: number, total: number): void {
  logStep(step, total, 'Seeding database...');

  const serverDir = resolve(ROOT, 'main/apps/server');

  if (!run(pm, ['db:seed'], { cwd: serverDir })) {
    logError('Failed to seed database');
    process.exit(1);
  }

  logSuccess('Database seeded with test data');
}

function runCodeGenerators(pm: PackageManager, step: number, total: number): void {
  logStep(step, total, 'Running code generators...');

  // Run config generators (path aliases, barrels, etc.)
  run(pm, ['config:generate'], { silent: true });

  logSuccess('Code generators completed');
}

function printSuccessMessage(pm: PackageManager, envConfig: EnvConfig): void {
  log('');
  log(color('╔════════════════════════════════════════════════════════════════╗', 'green'));
  log(
    color('║', 'green') +
      color('                    SETUP COMPLETE! 🎉                         ', 'bright') +
      color('║', 'green'),
  );
  log(color('╚════════════════════════════════════════════════════════════════╝', 'green'));
  log('');
  log(color('Your configuration:', 'bright'));

  if (envConfig.databaseProvider === 'postgresql') {
    log(
      `  Database: ${color(`PostgreSQL @ ${envConfig.postgresHost}:${envConfig.postgresPort}/${envConfig.postgresDb}`, 'dim')}`,
    );
  } else {
    log(`  Database: ${color(`JSON File @ ${envConfig.jsonDbPath}`, 'dim')}`);
  }

  log(
    `  Email:    ${color(envConfig.emailProvider === 'console' ? 'Console (mock)' : 'SMTP', 'cyan')}`,
  );
  log(`  Storage:  ${color(envConfig.storageProvider, 'cyan')}`);
  log(`  API Port: ${color(envConfig.apiPort, 'cyan')}`);
  log('');
  log(color('Next steps:', 'bright'));
  log('');
  log(`  ${color('1.', 'cyan')} Start the development servers:`);
  log(`     ${color(`${pm} dev`, 'yellow')}`);
  log('');
  log(`  ${color('2.', 'cyan')} Open in your browser:`);
  log(`     ${color('http://localhost:5173', 'blue')} (Web App)`);
  log(`     ${color(`http://localhost:${envConfig.apiPort}`, 'blue')} (API Server)`);
  log('');

  if (envConfig.databaseProvider === 'postgresql') {
    log(`  ${color('3.', 'cyan')} Test credentials:`);
    log(`     Email:    ${color('admin@example.com', 'yellow')}`);
    log(`     Password: ${color('password123', 'yellow')}`);
    log('');
  } else {
    log(`  ${color('3.', 'cyan')} Note: Using JSON mock database`);
    log(`     Data is stored in ${color(envConfig.jsonDbPath, 'yellow')}`);
    log(`     Register a new account to get started`);
    log('');
  }

  log(color('Useful commands:', 'bright'));
  log(`  ${color(`${pm} dev`, 'dim')}            - Start all dev servers`);
  log(`  ${color(`${pm} dev:web`, 'dim')}        - Start only web frontend`);
  log(`  ${color(`${pm} dev:server`, 'dim')}     - Start only API server`);
  log(`  ${color(`${pm} test`, 'dim')}           - Run tests`);
  log(`  ${color(`${pm} build`, 'dim')}          - Build for production`);

  if (envConfig.databaseProvider === 'postgresql') {
    log(`  ${color(`${pm} db:reset`, 'dim')}       - Reset database to fresh state`);
  }

  log('');
  log(color('Happy coding! 🚀', 'green'));
  log('');
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  printBanner();

  try {
    // Step 1: Select preset
    const preset = await selectPreset();

    // Step 2: Gather options (package manager, skip install)
    const options = await gatherOptions(preset);

    // Step 3: Get environment config based on preset
    let envConfig: EnvConfig;
    let useDocker = false;

    if (preset === 'custom') {
      envConfig = await gatherCustomEnvConfig();
      // For custom, check if they want Docker for PostgreSQL
      if (envConfig.databaseProvider === 'postgresql' && commandExists('docker')) {
        useDocker = true; // We already asked in gatherCustomEnvConfig
      }
    } else {
      envConfig = getPresetConfig(preset);
      // Docker preset uses Docker, Quick Start doesn't need it
      useDocker = preset === 'docker' && commandExists('docker');
    }

    // Summary before proceeding
    log('');
    log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
    log(color('                    SETUP SUMMARY', 'bright'));
    log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
    log(
      `  Preset:          ${color(preset === 'quick' ? 'Quick Start' : preset === 'docker' ? 'Docker Dev' : 'Custom', 'cyan')}`,
    );
    log(`  Package manager: ${color(options.packageManager, 'cyan')}`);
    log(
      `  Database:        ${color(envConfig.databaseProvider === 'postgresql' ? 'PostgreSQL' : 'JSON File', 'cyan')}`,
    );
    log(
      `  Email:           ${color(envConfig.emailProvider === 'console' ? 'Console (mock)' : 'SMTP', 'cyan')}`,
    );
    log(`  Storage:         ${color(envConfig.storageProvider, 'cyan')}`);
    log('');

    const proceed = await promptYesNo('Proceed with setup?', true);
    if (!proceed) {
      log('\nSetup cancelled.');
      process.exit(0);
    }

    const totalSteps = getStepCount(envConfig);
    let currentStep = 0;

    // Step 1: Install dependencies
    currentStep++;
    if (!options.skipInstall) {
      installDependencies(options.packageManager, currentStep, totalSteps);
    } else {
      logStep(currentStep, totalSteps, 'Skipping dependency installation...');
      logInfo('Using existing node_modules');
    }

    // Step 2: Setup environment file
    currentStep++;
    await setupEnvironment(envConfig, currentStep, totalSteps);

    // PostgreSQL-specific steps
    if (envConfig.databaseProvider === 'postgresql') {
      // Step 3: Docker (if available and using PostgreSQL)
      currentStep++;
      if (useDocker) {
        await setupDocker(envConfig, currentStep, totalSteps);
      } else {
        skipDockerStep(currentStep, totalSteps);
      }

      // Step 4: Push database schema
      currentStep++;
      pushDatabaseSchema(options.packageManager, currentStep, totalSteps);

      // Step 5: Seed database
      currentStep++;
      seedDatabase(options.packageManager, currentStep, totalSteps);
    }

    // Final step: Run code generators
    currentStep++;
    runCodeGenerators(options.packageManager, currentStep, totalSteps);

    // Done!
    printSuccessMessage(options.packageManager, envConfig);
  } catch (error) {
    if (error instanceof Error && error.message.includes('readline was closed')) {
      log('\n\nSetup cancelled.');
    } else {
      logError(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
void main();
