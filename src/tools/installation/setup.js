import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

import chalk from 'chalk';
import inquirer from 'inquirer';

const { blue, yellow, green, red } = chalk;

// Enhanced OS detection
const OS = {
  WINDOWS: 'windows',
  MACOS: 'macos',
  LINUX: 'linux',
  UNKNOWN: 'unknown'
};

function detectOS() {
  const platform = process.platform;
  if (platform === 'win32') return OS.WINDOWS;
  if (platform === 'darwin') return OS.MACOS;
  if (platform === 'linux') return OS.LINUX;
  return OS.UNKNOWN;
}

const currentOS = detectOS();

// Cross-platform sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to add spacing between sections
function printSection(message) {
  console.log('\n' + message + '\n');
}

// Execute commands based on the OS
function executeCommand(commands) {
  const command = commands[currentOS] || commands.default;
  if (!command) {
    throw new Error('No command available for this platform');
  }
  
  try {
    printSection(yellow(`Executing: ${command}`));
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    printSection(red(`Command failed: ${command}`));
    console.error(error.message);
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
  production: `# Production Environment Variables
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=production_db_password
DB_NAME=abe_stack_prod
DB_FALLBACK=false

# Server Configuration
PORT=8080
NODE_ENV=production
API_URL=https://api.your-domain.com
CLIENT_URL=https://your-domain.com

# Authentication
JWT_SECRET=your_production_jwt_secret_key
JWT_EXPIRATION=1d
REFRESH_TOKEN_EXPIRATION=7d

# Media
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=10485760
ALLOWED_MEDIA_TYPES=image/jpeg,image/png,image/gif,video/mp4,audio/mpeg

# Logging
LOG_LEVEL=warn
`
};

// Function to ensure environment files exist
function ensureEnvFiles() {
  const rootDir = process.cwd();
  const devEnvPath = path.join(rootDir, '.env.development');
  const prodEnvPath = path.join(rootDir, '.env.production');
  
  if (!existsSync(devEnvPath)) {
    printSection(yellow('Creating .env.development file with default values...'));
    writeFileSync(devEnvPath, envTemplates.development);
    printSection(green('✅ Created .env.development'));
  }
  
  if (!existsSync(prodEnvPath)) {
    printSection(yellow('Creating .env.production file with default values...'));
    writeFileSync(prodEnvPath, envTemplates.production);
    printSection(green('✅ Created .env.production'));
  }
  
  return { devEnvPath, prodEnvPath };
}

// Function to update environment variable in a file
function updateEnvVar(filePath, varName, value) {
  if (existsSync(filePath)) {
    let content = readFileSync(filePath, 'utf8');
    
    // Check if variable exists in the file
    const regex = new RegExp(`${varName}=.*`, 'g');
    if (regex.test(content)) {
      // Replace existing variable
      content = content.replace(regex, `${varName}=${value}`);
    } else {
      // Add variable at the end
      content += `\n${varName}=${value}`;
    }
    
    writeFileSync(filePath, content);
    return true;
  }
  return false;
}

async function main() {
  console.log(blue('\n==================================='));
  console.log(blue('    🚀 ABE Stack Setup Wizard'));
  console.log(blue('===================================\n'));
  
  printSection(blue(`Detected operating system: ${currentOS}`));
  
  // Ensure environment files exist
  const { devEnvPath, prodEnvPath } = ensureEnvFiles();
  
  let dockerAvailable = isDockerAvailable();
  
  // If Docker is not available, offer to retry after starting it
  if (!dockerAvailable) {
    printSection(yellow('⚠️  Docker is not available or not running.'));
    
    const { shouldStartDocker } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldStartDocker',
        message: 'Would you like to start Docker now and retry?',
        default: true
      }
    ]);
    
    if (shouldStartDocker) {
      let startMessage = 'Please start Docker';
      if (currentOS === OS.WINDOWS) startMessage += ' Desktop';
      else if (currentOS === OS.MACOS) startMessage += ' Desktop';
      else startMessage += ' service';
      
      printSection(yellow(startMessage + ' and then press Enter to continue...'));
      await inquirer.prompt([
        {
          type: 'input',
          name: 'confirmation',
          message: 'Press Enter after starting Docker...',
        }
      ]);
      
      // Check Docker availability again
      dockerAvailable = isDockerAvailable();
      
      if (dockerAvailable) {
        printSection(green('✅ Docker is now available!'));
      } else {
        printSection(red('❌ Docker is still not available. Proceeding with local setup.'));
      }
    } else {
      printSection(yellow('Proceeding without Docker...'));
    }
  }
  
  await runInteractiveSetup(dockerAvailable, devEnvPath, prodEnvPath);
}

// Check if Docker is available
function isDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

async function runInteractiveSetup(dockerAvailable, devEnvPath, prodEnvPath) {
  printSection(blue('📋 Setup Configuration'));
  
  const questions = [
    {
      type: 'confirm',
      name: 'useDocker',
      message: 'Do you want to use Docker?',
      default: true,
      when: () => dockerAvailable
    },
    {
      type: 'confirm',
      name: 'installDemoData',
      message: 'Install demo data?',
      default: true
    },
    {
      type: 'confirm',
      name: 'configureEnv',
      message: 'Configure environment variables?',
      default: true
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  // If Docker isn't available, force local setup
  if (!dockerAvailable) {
    answers.useDocker = false;
  }

  // Install dependencies first in all cases
  printSection(yellow('📦 Installing dependencies...'));
  execSync('npm install', { stdio: 'inherit' });

  // Configure environment variables if requested
  if (answers.configureEnv) {
    await configureEnvironment(devEnvPath, prodEnvPath, answers.useDocker);
  }

  // Execute setup based on answers
  if (answers.useDocker) {
    try {
      printSection(yellow('🐳 Setting up with Docker...'));
      
      // Pull the images first
      printSection(yellow('Pulling required Docker images...'));
      execSync('docker pull postgres:14-alpine', { stdio: 'inherit' });
      
      // Then start the containers
      printSection(yellow('Starting Docker containers...'));
      execSync('docker-compose up -d', { stdio: 'inherit' });
      printSection(green('✅ Docker containers started in background'));
      
      // Brief pause to let PostgreSQL initialize
      printSection(yellow('Waiting for PostgreSQL to initialize...'));
      console.log('This may take a few seconds...');
      
      // Use JavaScript's setTimeout for cross-platform compatibility
      await sleep(5000);
      printSection(green('✅ Database should be ready now'));
      
    } catch (error) {
      printSection(red('Docker setup failed:'));
      console.error(error.message);
      printSection(yellow('Falling back to local setup...'));
      
      // Reconfigure environment for local setup
      await configureLocalEnvironment(devEnvPath, prodEnvPath);
    }
  }
  
  // Prompt to ensure database is ready if not using Docker
  if (!answers.useDocker) {
    printSection(yellow('⚠️ Please make sure your PostgreSQL database is running before continuing.'));
    const { confirmDbReady } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDbReady',
        message: 'Is your PostgreSQL database ready?',
        default: true
      }
    ]);
    
    if (!confirmDbReady) {
      printSection(red('Setup aborted. Please start your PostgreSQL database and run setup again.'));
      process.exit(1);
    }
  }
  
  // Seed database if requested (after Docker is set up if using Docker)
  if (answers.installDemoData) {
    printSection(yellow('🗄️ Setting up database with demo data...'));
    
    const seedCommands = {
      [OS.WINDOWS]: 'npm run seed:demo:js',
      [OS.MACOS]: 'npm run seed:demo',
      [OS.LINUX]: 'npm run seed:demo',
      default: 'npm run seed:demo:js'
    };
    
    const seedSuccess = executeCommand(seedCommands);
    
    if (!seedSuccess) {
      printSection(red('Error setting up database.'));
      
      const { continueSetup } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueSetup',
          message: 'Continue setup without demo data?',
          default: true
        }
      ]);
      
      if (!continueSetup) {
        process.exit(1);
      }
    }
  }
  
  // Start dev server
  printSection(green('✅ Setup complete! Starting development server...'));
  execSync('npm run dev', { stdio: 'inherit' });
}

// Function to configure environment files
async function configureEnvironment(devEnvPath, prodEnvPath, useDocker) {
  printSection(blue('🔧 Environment Configuration'));
  
  // First, configure development environment
  await configureDevelopmentEnv(devEnvPath, useDocker);
  
  // Then ask if user wants to configure production
  const { configureProduction } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configureProduction',
      message: 'Do you want to configure production environment variables?',
      default: false
    }
  ]);
  
  if (configureProduction) {
    await configureProductionEnv(prodEnvPath);
  }
}

// Function to configure development environment
async function configureDevelopmentEnv(envPath, useDocker) {
  printSection(yellow('Configuring development environment...'));
  
  // Database configuration
  const dbConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'DB_HOST',
      message: 'Database host:',
      default: useDocker ? 'postgres' : 'localhost'
    },
    {
      type: 'input',
      name: 'DB_PORT',
      message: 'Database port:',
      default: '5432'
    },
    {
      type: 'input',
      name: 'DB_USER',
      message: 'Database user:',
      default: 'postgres'
    },
    {
      type: 'password',
      name: 'DB_PASSWORD',
      message: 'Database password:',
      default: 'postgres'
    },
    {
      type: 'input',
      name: 'DB_NAME',
      message: 'Database name:',
      default: 'abe_stack'
    }
  ]);
  
  // Server configuration
  const serverConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'PORT',
      message: 'Server port:',
      default: '8080'
    },
    {
      type: 'input',
      name: 'API_URL',
      message: 'API URL:',
      default: 'http://localhost:8080'
    },
    {
      type: 'input',
      name: 'CLIENT_URL',
      message: 'Client URL:',
      default: 'http://localhost:3000'
    }
  ]);
  
  // JWT configuration
  const jwtConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'JWT_SECRET',
      message: 'JWT secret (for development):',
      default: 'dev_jwt_secret_' + Math.random().toString(36).substring(2, 15)
    }
  ]);
  
  // Update environment file
  Object.entries({ ...dbConfig, ...serverConfig, ...jwtConfig }).forEach(([key, value]) => {
    updateEnvVar(envPath, key, value);
  });
  
  printSection(green('✅ Development environment configured'));
}

// Function to configure production environment
async function configureProductionEnv(envPath) {
  printSection(yellow('Configuring production environment...'));
  
  // Database configuration
  const dbConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'DB_HOST',
      message: 'Production database host:',
      default: 'localhost'
    },
    {
      type: 'input',
      name: 'DB_PORT',
      message: 'Production database port:',
      default: '5432'
    },
    {
      type: 'input',
      name: 'DB_USER',
      message: 'Production database user:',
      default: 'postgres'
    },
    {
      type: 'password',
      name: 'DB_PASSWORD',
      message: 'Production database password:',
      default: 'production_password'
    },
    {
      type: 'input',
      name: 'DB_NAME',
      message: 'Production database name:',
      default: 'abe_stack_prod'
    }
  ]);
  
  // Server configuration
  const serverConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'PORT',
      message: 'Production server port:',
      default: '8080'
    },
    {
      type: 'input',
      name: 'API_URL',
      message: 'Production API URL:',
      default: 'https://api.your-domain.com'
    },
    {
      type: 'input',
      name: 'CLIENT_URL',
      message: 'Production client URL:',
      default: 'https://your-domain.com'
    }
  ]);
  
  // JWT configuration
  const jwtConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'JWT_SECRET',
      message: 'Production JWT secret:',
      default: 'prod_jwt_secret_' + Math.random().toString(36).substring(2, 15)
    }
  ]);
  
  // Update environment file
  Object.entries({ ...dbConfig, ...serverConfig, ...jwtConfig }).forEach(([key, value]) => {
    updateEnvVar(envPath, key, value);
  });
  
  printSection(green('✅ Production environment configured'));
}

// Function to configure local environment after Docker failure
async function configureLocalEnvironment(devEnvPath, prodEnvPath) {
  const { configureDb } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configureDb',
      message: 'Do you want to configure local database connection?',
      default: true
    }
  ]);
  
  if (configureDb) {
    // Update database configuration
    const dbConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'DB_HOST',
        message: 'Database host:',
        default: 'localhost'
      },
      {
        type: 'input',
        name: 'DB_PORT',
        message: 'Database port:',
        default: '5432'
      },
      {
        type: 'input',
        name: 'DB_USER',
        message: 'Database user:',
        default: 'postgres'
      },
      {
        type: 'password',
        name: 'DB_PASSWORD',
        message: 'Database password:',
        default: 'postgres'
      },
      {
        type: 'input',
        name: 'DB_NAME',
        message: 'Database name:',
        default: 'abe_stack'
      }
    ]);
    
    // Update both environment files
    Object.entries(dbConfig).forEach(([key, value]) => {
      updateEnvVar(devEnvPath, key, value);
    });
    
    printSection(green('✅ Local database configuration updated'));
  }
}

main().catch(console.error); 