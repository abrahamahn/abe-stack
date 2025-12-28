import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import readline from 'readline';

// Simple cross-platform sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// OS detection
const OS = {
  WINDOWS: 'windows',
  MACOS: 'macos',
  LINUX: 'linux',
  UNKNOWN: 'unknown',
} as const;

function detectOS() {
  const platform = process.platform;
  if (platform === 'win32') return OS.WINDOWS;
  if (platform === 'darwin') return OS.MACOS;
  if (platform === 'linux') return OS.LINUX;
  return OS.UNKNOWN;
}

const currentOS = detectOS();

// Simple console helpers (no dependencies)
function log(message: string, prefix = 'ℹ') {
  console.log(`${prefix} ${message}`);
}

function logSuccess(message: string) {
  console.log(`✓ ${message}`);
}

function logError(message: string) {
  console.error(`✗ ${message}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Simple yes/no prompts using native readline
function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

function askInput(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer || defaultValue || '');
    });
  });
}

// Check if prerequisite is installed
function isPrerequisiteInstalled(prerequisite: string): boolean {
  try {
    const commands: Record<string, string> = {
      node: 'node --version',
      npm: 'npm --version',
      docker: 'docker --version',
      postgresql: currentOS === OS.WINDOWS ? 'where psql' : 'psql --version',
    };

    execSync(commands[prerequisite] || prerequisite, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isDockerAvailable(): boolean {
  try {
    const result = execSync('docker info', { stdio: 'pipe', encoding: 'utf8' });
    return !!(result && !result.includes('error') && !result.includes('Cannot connect'));
  } catch {
    return false;
  }
}

// Environment file templates
const envTemplates = {
  development: `# Development Environment Variables
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=abe_stack
DB_FALLBACK=false

# Server Configuration
PORT=8080
NODE_ENV=development
API_URL=http://localhost:8080
CLIENT_URL=http://localhost:3000

# Authentication
JWT_SECRET=your_development_jwt_secret_key
JWT_EXPIRATION=1d
REFRESH_TOKEN_EXPIRATION=7d

# Media
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=10485760
ALLOWED_MEDIA_TYPES=image/jpeg,image/png,image/gif,video/mp4,audio/mpeg

# Logging
LOG_LEVEL=debug
`,
};

function ensureEnvFiles() {
  const rootDir = process.cwd();
  const devEnvPath = path.join(rootDir, '.env.development');

  if (!existsSync(devEnvPath)) {
    log('Creating .env.development file...');
    writeFileSync(devEnvPath, envTemplates.development);
    logSuccess('Created .env.development');
  } else {
    logSuccess('Found existing .env.development');
  }

  return { devEnvPath };
}

// Main setup function
async function main() {
  console.clear();

  logSection('ABE STACK SETUP');

  log(`Operating System: ${currentOS.toUpperCase()}`);

  // Check prerequisites
  logSection('Checking Prerequisites');
  const hasNode = isPrerequisiteInstalled('node');
  const hasNpm = isPrerequisiteInstalled('npm');
  const hasDocker = isPrerequisiteInstalled('docker');
  const hasPostgres = isPrerequisiteInstalled('postgresql');

  log(`Node.js: ${hasNode ? '✓ installed' : '✗ not found'}`);
  log(`npm: ${hasNpm ? '✓ installed' : '✗ not found'}`);
  log(`Docker: ${hasDocker ? '✓ installed' : '✗ not found'}`);
  log(`PostgreSQL: ${hasPostgres ? '✓ installed' : '✗ not found'}`);

  if (!hasNode || !hasNpm) {
    logError('Node.js and npm are required. Please install them first.');
    process.exit(1);
  }

  // Create environment files
  logSection('Environment Configuration');
  const { devEnvPath } = ensureEnvFiles();

  // Install dependencies
  logSection('Installing Dependencies');
  log('Running npm install...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('Dependencies installed');
  } catch (error) {
    logError('Failed to install dependencies');
    process.exit(1);
  }

  // Docker setup
  const dockerAvailable = isDockerAvailable();
  let useDocker = false;

  if (dockerAvailable) {
    logSection('Database Setup');
    useDocker = await askYesNo('Use Docker for PostgreSQL database?');

    if (useDocker) {
      log('Starting Docker containers...');
      try {
        execSync('docker-compose up -d', { stdio: 'inherit' });
        logSuccess('Docker containers started');

        log('Waiting for PostgreSQL to initialize...');
        await sleep(5000);
        logSuccess('Database ready');
      } catch (error) {
        logError('Failed to start Docker containers');
        useDocker = false;
      }
    }
  }

  // Seed database
  const shouldSeed = await askYesNo('Install demo data?');

  if (shouldSeed) {
    logSection('Database Seeding');
    log('Seeding database with demo data...');
    try {
      const seedCommand = currentOS === OS.WINDOWS ? 'npm run seed:demo:js' : 'npm run seed:demo';
      execSync(seedCommand, { stdio: 'inherit' });
      logSuccess('Database seeded successfully');
    } catch (error) {
      logError("Failed to seed database. You can run 'npm run seed:demo' manually later.");
    }
  }

  // Complete
  logSection('Setup Complete!');
  logSuccess('Abe Stack is ready to use');

  const shouldStart = await askYesNo('Start development server now?');

  if (shouldStart) {
    log('\nStarting development server...\n');
    execSync('npm run dev', { stdio: 'inherit' });
  } else {
    log('\nTo start the development server later, run: npm run dev\n');
  }
}

// Error handling
process.on('SIGINT', () => {
  console.log('\n\nSetup interrupted. Exiting...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logError(`Unexpected error: ${err.message}`);
  process.exit(1);
});

// Run setup
main().catch((error) => {
  logError(`Setup failed: ${error.message}`);
  process.exit(1);
});
