import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import readline from "readline";

import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import inquirer from "inquirer";
import ora from "ora";

const { blue, yellow, green, red } = chalk;

// Enhanced OS detection
const OS = {
  WINDOWS: "windows",
  MACOS: "macos",
  LINUX: "linux",
  UNKNOWN: "unknown",
};

function detectOS() {
  const platform = process.platform;
  if (platform === "win32") return OS.WINDOWS;
  if (platform === "darwin") return OS.MACOS;
  if (platform === "linux") return OS.LINUX;
  return OS.UNKNOWN;
}

const currentOS = detectOS();

// Cross-platform sleep function
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to add spacing between sections

// Enhanced section print with cleaner, more modern style
function printEnhancedSection(message: string, type = "info") {
  const colors: Record<string, chalk.Chalk> = {
    info: blue,
    warning: yellow,
    success: green,
    error: red,
  };

  const color = colors[type] || colors.info;
  const padding = " ".repeat(2);

  // Split message into lines if it contains newlines
  const lines = message.split("\n");
  const maxLineLength = Math.max(...lines.map((line: string) => line.length));
  const width = Math.min(100, maxLineLength + 6);
  const horizontalLine = "─".repeat(width);

  // Small badge for the message type
  const badge = type.toUpperCase();
  const badgeDisplay = width > badge.length + 4 ? ` ${badge} ` : "";

  console.log();
  console.log(
    color(`┌${badgeDisplay}${horizontalLine.slice(badgeDisplay.length)}┐`),
  );

  for (const line of lines) {
    const rightPadding = " ".repeat(width - line.length - 4);
    console.log(color(`│${padding}${line}${rightPadding}${padding}│`));
  }

  console.log(color(`└${horizontalLine}┘`));
  console.log();
}

// Create a spinner with the given text
function createSpinner(text: string) {
  return ora({
    text,
    spinner: "dots",
    color: "blue",
  });
}

// Execute commands based on the OS with spinner

// Check if a prerequisite is installed
function isPrerequisiteInstalled(prerequisite: string) {
  try {
    switch (prerequisite) {
      case "node":
        execSync("node --version", { stdio: "ignore" });
        return true;
      case "npm":
        execSync("npm --version", { stdio: "ignore" });
        return true;
      case "docker":
        execSync("docker --version", { stdio: "ignore" });
        return true;
      case "postgresql":
        // Different commands for different OS
        if (currentOS === OS.WINDOWS) {
          // For Windows, try a different approach
          try {
            execSync("where psql", { stdio: "ignore" });
            return true;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            return false;
          }
        } else {
          execSync("psql --version", { stdio: "ignore" });
          return true;
        }
      case "brew":
        if (currentOS === OS.MACOS) {
          execSync("brew --version", { stdio: "ignore" });
          return true;
        }
        return false;
      case "choco":
        if (currentOS === OS.WINDOWS) {
          try {
            execSync("choco --version", { stdio: "ignore" });
            return true;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            return false;
          }
        }
        return false;
      default:
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    return false;
  }
}

// Install package manager if needed
async function installPackageManager() {
  const spinner = createSpinner("Checking for package manager...");
  spinner.start();

  let needsInstall = false;
  let installCommand = "";
  let packageManagerName = "";

  if (currentOS === OS.MACOS && !isPrerequisiteInstalled("brew")) {
    needsInstall = true;
    packageManagerName = "Homebrew";
    installCommand =
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
    spinner.text = "Homebrew not found. Need to install...";
  } else if (currentOS === OS.WINDOWS && !isPrerequisiteInstalled("choco")) {
    needsInstall = true;
    packageManagerName = "Chocolatey";
    installCommand =
      "powershell -Command \"Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))\"";
    spinner.text = "Chocolatey not found. Need to install...";
  }

  if (needsInstall) {
    spinner.warn(
      `${packageManagerName} not found. It's needed to install prerequisites.`,
    );

    const { confirmInstall } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmInstall",
        message: `Do you want to install ${packageManagerName}?`,
        default: true,
      },
    ]);

    if (confirmInstall) {
      const installSpinner = createSpinner(
        `Installing ${packageManagerName}...`,
      );
      try {
        execSync(installCommand, { stdio: "inherit" });
        installSpinner.succeed(`${packageManagerName} installed successfully!`);
        // On macOS, additional step needed for brew
        if (currentOS === OS.MACOS) {
          console.log(
            "You may need to add Homebrew to your PATH and restart this setup script.",
          );
        }
        return true;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        installSpinner.fail(
          `Failed to install ${packageManagerName}: ${errorMessage}`,
        );
        console.error(errorMessage);
        return false;
      }
    } else {
      spinner.fail(`${packageManagerName} installation skipped.`);
      return false;
    }
  }

  if (currentOS === OS.MACOS) {
    spinner.succeed("Homebrew is already installed");
  } else if (currentOS === OS.WINDOWS) {
    if (isPrerequisiteInstalled("choco")) {
      spinner.succeed("Chocolatey is already installed");
    } else {
      spinner.info("No package manager check needed for this OS");
    }
  } else {
    spinner.info("No package manager check needed for this OS");
  }

  return true;
}

// Install a prerequisite using the appropriate package manager
async function installPrerequisite(prerequisite: string) {
  const commands = {
    node: {
      [OS.MACOS]: "brew install node@18",
      [OS.WINDOWS]: "choco install nodejs-lts -y",
      [OS.LINUX]: "sudo apt update && sudo apt install -y nodejs npm",
      default: 'echo "No installation command for Node.js on this OS"',
    },
    docker: {
      [OS.MACOS]: "brew install --cask docker",
      [OS.WINDOWS]: "choco install docker-desktop -y",
      [OS.LINUX]:
        "sudo apt update && sudo apt install -y docker.io docker-compose && sudo systemctl enable --now docker",
      default: 'echo "No installation command for Docker on this OS"',
    },
    postgresql: {
      [OS.MACOS]:
        "brew install postgresql@14 && brew services start postgresql@14",
      [OS.WINDOWS]: "choco install postgresql -y",
      [OS.LINUX]:
        "sudo apt update && sudo apt install -y postgresql postgresql-contrib && sudo systemctl enable --now postgresql",
      default: 'echo "No installation command for PostgreSQL on this OS"',
    },
  };

  const spinner = createSpinner(`Installing ${prerequisite}...`);

  try {
    const command =
      commands[prerequisite as keyof typeof commands][currentOS] ||
      commands[prerequisite as keyof typeof commands].default;
    execSync(command, { stdio: "inherit" });
    spinner.succeed(`${prerequisite} installed successfully!`);
    if (prerequisite === "postgresql" && currentOS === OS.LINUX) {
      console.log(
        yellow(
          "Note: On Linux, you might need to set up a PostgreSQL user and permissions.",
        ),
      );
    }
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    spinner.fail(`Failed to install ${prerequisite}: ${errorMessage}`);
    console.error(errorMessage);
    return false;
  }
}

// Function to check all prerequisites and offer installation
async function checkAndInstallPrerequisites() {
  printEnhancedSection("🔍 Checking Prerequisites", "info");

  const prerequisites = {
    node: {
      name: "Node.js",
      installed: isPrerequisiteInstalled("node"),
    },
    postgresql: {
      name: "PostgreSQL",
      installed: isPrerequisiteInstalled("postgresql"),
    },
    docker: {
      name: "Docker",
      installed: isPrerequisiteInstalled("docker"),
    },
  };

  // Display current status
  for (const [, value] of Object.entries(prerequisites)) {
    if (value.installed) {
      console.log(`${green("✓")} ${value.name} is already installed`);
    } else {
      console.log(`${yellow("!")} ${value.name} is not installed`);
    }
  }

  // Check if all prerequisites are installed
  const allInstalled = Object.values(prerequisites).every((p) => p.installed);

  if (allInstalled) {
    printEnhancedSection("All prerequisites are already installed!", "success");
    return true;
  }

  // Ask if user wants to install missing prerequisites
  const { installMissing } = await inquirer.prompt([
    {
      type: "confirm",
      name: "installMissing",
      message: "Do you want to install missing prerequisites?",
      default: true,
    },
  ]);

  if (!installMissing) {
    printEnhancedSection(
      "Continuing without installing prerequisites.",
      "warning",
    );
    return false;
  }

  // Install package manager if needed
  const packageManagerInstalled = await installPackageManager();
  if (
    !packageManagerInstalled &&
    (currentOS === OS.MACOS || currentOS === OS.WINDOWS)
  ) {
    printEnhancedSection(
      "Cannot proceed without a package manager. Please install manually.",
      "error",
    );
    return false;
  }

  // Install each missing prerequisite
  for (const [key, value] of Object.entries(prerequisites)) {
    if (!value.installed) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `Install ${value.name}?`,
          default: true,
        },
      ]);

      if (confirm) {
        await installPrerequisite(key);
      }
    }
  }

  return true;
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
`,
};

// Function to ensure environment files exist
function ensureEnvFiles() {
  const rootDir = process.cwd();
  const devEnvPath = path.join(rootDir, ".env.development");
  const prodEnvPath = path.join(rootDir, ".env.production");

  const spinner = createSpinner("Checking environment files...");

  if (!existsSync(devEnvPath)) {
    spinner.text = "Creating .env.development file with default values...";
    writeFileSync(devEnvPath, envTemplates.development);
    spinner.succeed("Created .env.development successfully");
  } else {
    spinner.succeed("Found existing .env.development file");
  }

  const spinner2 = createSpinner("Checking production environment file...");
  if (!existsSync(prodEnvPath)) {
    spinner2.text = "Creating .env.production file with default values...";
    writeFileSync(prodEnvPath, envTemplates.production);
    spinner2.succeed("Created .env.production successfully");
  } else {
    spinner2.succeed("Found existing .env.production file");
  }

  return { devEnvPath, prodEnvPath };
}

// Function to update environment variable in a file
function updateEnvVar(filePath: string, varName: string, value: string) {
  if (existsSync(filePath)) {
    let content = readFileSync(filePath, "utf8");

    // Check if variable exists in the file
    const regex = new RegExp(`${varName}=.*`, "g");
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

// Add function to check if PostgreSQL client is available
function isPsqlAvailable() {
  try {
    execSync("psql --version", { stdio: "ignore" });
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    return false;
  }
}

// Force enable raw mode handling for better terminal control
// Only set raw mode if we have a TTY
if (process.stdin.isTTY) {
  process.stdin.setRawMode?.(true);
}

async function main() {
  // Create a cleanup function we'll use in multiple places
  const cleanupTerminal = () => {
    try {
      // Restore terminal settings
      if (process.stdin.isTTY) {
        process.stdin.setRawMode?.(false);
      }
      process.stdin.resume();

      // For Windows PowerShell - execute a command to reset console mode
      if (process.platform === "win32") {
        try {
          // This will help reset the PowerShell terminal
          execSync("powershell -Command Write-Host", { stdio: "ignore" });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // Ignore errors - this is just a best effort
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      // Just in case cleanup itself fails
      console.error("Error during terminal cleanup:", errorMessage);
    }
  };

  // Register the cleanup function for various exit scenarios
  process.on("exit", cleanupTerminal);
  process.on("SIGTERM", () => {
    console.log("\n\nSetup terminated. Exiting...");
    cleanupTerminal();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("\n\nSetup interrupted. Exiting...");
    cleanupTerminal();
    process.exit(0);
  });

  // For Windows, handle special Ctrl+C events
  if (process.platform === "win32" && process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      sigint: true, // Ensure SIGINT is properly handled
    } as readline.ReadLineOptions);

    rl.on("SIGINT", () => {
      process.emit("SIGINT");
    });

    // Store the readline interface to close it on exit
    process.on("exit", () => {
      rl.close();
    });
  }

  process.on("uncaughtException", (err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("\n\nUnexpected error:", errorMessage);
    cleanupTerminal();
    process.exit(1);
  });

  // Create a cleaner, more modern title banner
  console.clear();

  // Generate title with figlet but display it with a cleaner format
  const titleText = figlet.textSync("ABE Stack", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  // Display with gradient
  console.log("\n");
  console.log(gradient.cristal.multiline(titleText));

  // Modern, simple subtitle
  const version = "v1.0.0";
  const subtitle = "Modern TypeScript React Boilerplate";

  console.log("\n");
  console.log(gradient.pastel(`  ${subtitle}  ${version}`));
  console.log(
    gradient.pastel("  " + "─".repeat(subtitle.length + version.length + 2)),
  );
  console.log("\n");

  // OS detection with icon
  const osIcons = {
    [OS.WINDOWS]: "🪟",
    [OS.MACOS]: "🍎",
    [OS.LINUX]: "🐧",
    [OS.UNKNOWN]: "❓",
  };

  printEnhancedSection(
    `${osIcons[currentOS]} Detected operating system: ${currentOS.toUpperCase()}`,
    "info",
  );

  // Check and install prerequisites if needed
  await checkAndInstallPrerequisites();

  // Ensure environment files exist
  const { devEnvPath, prodEnvPath } = ensureEnvFiles();

  // Docker check with spinner
  const dockerSpinner = createSpinner("Checking if Docker is available...");
  dockerSpinner.start();
  let dockerAvailable = isDockerAvailable();

  if (dockerAvailable) {
    dockerSpinner.succeed("Docker is available and running");
  } else {
    dockerSpinner.fail("Docker is not available or not running");
  }

  // If Docker is not available, offer to retry after starting it
  if (!dockerAvailable) {
    printEnhancedSection(
      "Docker is not available or not running. You may need to start it manually.",
      "warning",
    );

    const { shouldStartDocker } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldStartDocker",
        message: "Would you like to start Docker now and retry?",
        default: true,
      },
    ]);

    if (shouldStartDocker) {
      let startMessage = "Please start Docker";
      if (currentOS === OS.WINDOWS) startMessage += " Desktop";
      else if (currentOS === OS.MACOS) startMessage += " Desktop";
      else startMessage += " service";

      printEnhancedSection(
        startMessage + " and then press Enter to continue...",
        "info",
      );
      await inquirer.prompt([
        {
          type: "input",
          name: "confirmation",
          message: "Press Enter after starting Docker...",
        },
      ]);

      // Check Docker availability again with spinner
      const retrySpinner = createSpinner(
        "Checking Docker availability again...",
      );
      await sleep(1500); // Add delay for visual effect

      dockerAvailable = isDockerAvailable();

      if (dockerAvailable) {
        retrySpinner.succeed("Docker is now available!");
      } else {
        retrySpinner.fail("Docker is still not available");
        printEnhancedSection("Proceeding with local setup instead", "warning");
      }
    } else {
      printEnhancedSection("Proceeding without Docker...", "info");
    }
  }

  await runInteractiveSetup(Boolean(dockerAvailable), devEnvPath, prodEnvPath);
}

// Check if Docker is available
function isDockerAvailable() {
  try {
    const result = execSync("docker info", { stdio: "pipe", encoding: "utf8" });
    // Specifically check the output for signs that Docker is actually running
    return (
      result && !result.includes("error") && !result.includes("Cannot connect")
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    // Docker command failed or not installed
    return false;
  }
}

// Add this function
function createPromptModule(): ReturnType<typeof inquirer.createPromptModule> {
  const inquirerModule = inquirer.createPromptModule();
  return inquirerModule;
}

async function runInteractiveSetup(
  dockerAvailable: boolean,
  devEnvPath: string,
  prodEnvPath: string,
) {
  printEnhancedSection("🛠️ SETUP CONFIGURATION", "info");

  // Use gradient for the prompt
  console.log(
    gradient.cristal(
      "Please answer the following questions to configure your installation:\n",
    ),
  );

  const questions = [
    {
      type: "list",
      name: "useDocker",
      message: "How do you want to set up the database?",
      choices: [
        { name: "Use Docker (database in container)", value: true },
        {
          name: "Use local PostgreSQL (installed on your machine)",
          value: false,
        },
      ],
      default: dockerAvailable,
      when: () => dockerAvailable,
    },
    {
      type: "confirm",
      name: "installDemoData",
      message: "Install demo data?",
      default: true,
    },
    {
      type: "list",
      name: "envSetup",
      message: "How would you like to set up environment variables?",
      choices: [
        {
          name: "Use default values (no configuration needed)",
          value: "default",
        },
        { name: "Configure manually", value: "manual" },
        { name: "Skip environment setup", value: "skip" },
      ],
      default: "default",
    },
  ];

  // Create inquirer with explicit SIGINT handling
  const promptWithSigint = createPromptModule();
  const answers = await promptWithSigint(questions);

  // Extract database connection info from env file for later use
  let DB_HOST = "localhost";
  let DB_PORT = "5432";
  let DB_USER = "postgres";
  let DB_PASSWORD = "postgres";

  try {
    if (existsSync(devEnvPath)) {
      const envContent = readFileSync(devEnvPath, "utf8");
      const hostMatch = envContent.match(/DB_HOST=([^\r\n]+)/);
      const portMatch = envContent.match(/DB_PORT=([^\r\n]+)/);
      const userMatch = envContent.match(/DB_USER=([^\r\n]+)/);
      const passwordMatch = envContent.match(/DB_PASSWORD=([^\r\n]+)/);

      if (hostMatch) DB_HOST = hostMatch[1];
      if (portMatch) DB_PORT = portMatch[1];
      if (userMatch) DB_USER = userMatch[1];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      if (passwordMatch) DB_PASSWORD = passwordMatch[1];
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(yellow("Could not read database config from environment file"));
    console.error(errorMessage);
  }

  // If Docker isn't available, force local setup
  if (!dockerAvailable) {
    answers.useDocker = false;
  }

  // Install dependencies first in all cases
  const installSpinner = createSpinner("Installing dependencies...");
  try {
    execSync("npm install", { stdio: "ignore" });
    installSpinner.succeed("Dependencies installed successfully");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    installSpinner.fail(`Failed to install dependencies: ${errorMessage}`);
    printEnhancedSection(`Error: ${errorMessage}`, "error");
    process.exit(1);
  }

  // Handle environment files based on selected option
  if (answers.envSetup === "manual") {
    await configureEnvironment(devEnvPath, prodEnvPath, answers.useDocker);
  } else if (answers.envSetup === "default") {
    const spinner = createSpinner(
      "Creating environment files with default values...",
    );

    // Always ensure DB_HOST is set to localhost for simplicity
    let content = readFileSync(devEnvPath, "utf8");
    content = content.replace(/DB_HOST=postgres/, "DB_HOST=localhost");
    writeFileSync(devEnvPath, content);

    if (answers.useDocker && dockerAvailable) {
      spinner.succeed(
        "Environment files created with default values (Docker mode with localhost)",
      );
    } else {
      spinner.succeed(
        "Environment files created with default values (local mode)",
      );
    }
  }
  // Skip if user selected "skip"

  // Execute setup based on answers
  if (answers.useDocker) {
    printEnhancedSection("🐳 Setting up with Docker", "info");

    try {
      // Pull the images first
      const pullSpinner = createSpinner("Pulling required Docker images...");
      execSync("docker pull postgres:14-alpine", { stdio: "ignore" });
      pullSpinner.succeed("Docker images pulled successfully");

      // Then start the containers
      const containerSpinner = createSpinner("Starting Docker containers...");
      execSync("docker-compose up -d", { stdio: "ignore" });
      containerSpinner.succeed("Docker containers started in background");

      // Brief pause to let PostgreSQL initialize
      const dbSpinner = createSpinner(
        "Waiting for PostgreSQL to initialize...",
      );

      // Use JavaScript's setTimeout for cross-platform compatibility
      await sleep(5000);
      dbSpinner.succeed("Database ready");
    } catch (error: unknown) {
      printEnhancedSection("Docker setup failed", "error");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(errorMessage);
      printEnhancedSection("Falling back to local setup...", "warning");

      // Reconfigure environment for local setup
      await configureLocalEnvironment(devEnvPath, prodEnvPath);
    }
  }

  // Prompt to ensure database is ready if not using Docker
  if (!answers.useDocker) {
    printEnhancedSection("⚠️ PostgreSQL Check", "warning");
    console.log(
      "Please make sure your PostgreSQL database is running before continuing.",
    );

    const { confirmDbReady } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmDbReady",
        message: "Is your PostgreSQL database ready?",
        default: true,
      },
    ]);

    if (!confirmDbReady) {
      printEnhancedSection(
        "Setup aborted. Please start your PostgreSQL database and run setup again.",
        "error",
      );
      process.exit(1);
    }
  }

  // Seed database if requested (after Docker is set up if using Docker)
  if (answers.installDemoData) {
    printEnhancedSection("🗄️ Database Setup", "info");

    // Check if psql is available
    const psqlAvailable = isPsqlAvailable();
    if (!psqlAvailable) {
      printEnhancedSection(
        "PostgreSQL client (psql) not found in the PATH",
        "error",
      );
      console.log(
        yellow("The psql command line tool is required for database seeding."),
      );

      if (currentOS === OS.WINDOWS) {
        console.log(
          yellow("Make sure PostgreSQL is installed and added to your PATH."),
        );
        console.log(
          yellow("You might need to restart your terminal after installation."),
        );
      } else if (currentOS === OS.MACOS) {
        console.log(
          yellow(
            "Try installing with: brew install libpq && brew link --force libpq",
          ),
        );
      } else {
        console.log(
          yellow("Try installing with: sudo apt install postgresql-client"),
        );
      }

      const { continueWithoutSeed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "continueWithoutSeed",
          message: "Continue without seeding the database?",
          default: true,
        },
      ]);

      if (!continueWithoutSeed) {
        process.exit(1);
      }
    } else {
      // Add a longer delay to ensure database is fully ready
      if (answers.useDocker) {
        const waitSpinner = createSpinner(
          "Ensuring database is fully initialized...",
        );
        await sleep(8000); // Add extra time for PostgreSQL to fully initialize
        waitSpinner.succeed("Database should be ready now");
      }

      let seedSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!seedSuccess && attempts < maxAttempts) {
        attempts++;
        const seedSpinner = createSpinner(
          `Setting up database with demo data (attempt ${attempts}/${maxAttempts})...`,
        );

        try {
          // Use spawnSync for better error handling with stdio: 'pipe'
          const seedCommand =
            currentOS === OS.WINDOWS
              ? "npm run seed:demo:js"
              : "npm run seed:demo";

          execSync(seedCommand, {
            env: { ...process.env, PGPASSWORD: DB_PASSWORD },
            stdio: "pipe",
            encoding: "utf8",
          });

          seedSpinner.succeed("Database seeded successfully with demo data");
          seedSuccess = true;
        } catch (error: unknown) {
          seedSpinner.fail(
            `Error setting up database (attempt ${attempts}/${maxAttempts})`,
          );

          // Extract and display the error details
          let errorOutput =
            error instanceof Error ? error.message : String(error);
          const errorObj = error as { stdout?: string; stderr?: string };
          if (errorObj.stdout) errorOutput += "\nStdout: " + errorObj.stdout;
          if (errorObj.stderr) errorOutput += "\nStderr: " + errorObj.stderr;

          // Check for specific error patterns and provide targeted advice
          if (
            errorOutput.includes("connection refused") ||
            errorOutput.includes("could not connect to server")
          ) {
            printEnhancedSection(
              `PostgreSQL Connection Error: Cannot connect to database server`,
              "error",
            );
            console.log(
              yellow(
                `Make sure PostgreSQL is running and accessible at ${DB_HOST}:${DB_PORT}.`,
              ),
            );

            if (answers.useDocker) {
              console.log(
                yellow(
                  "For Docker setup, check if the PostgreSQL container is running:",
                ),
              );
              console.log("  docker ps | grep postgres");
              console.log(yellow("You might need to restart the container:"));
              console.log("  docker-compose down && docker-compose up -d");
            } else {
              console.log(yellow("For local PostgreSQL:"));
              if (currentOS === OS.WINDOWS) {
                console.log(
                  "  Check if the PostgreSQL service is running in Services.",
                );
              } else if (currentOS === OS.MACOS) {
                console.log("  Try: brew services restart postgresql");
              } else {
                console.log("  Try: sudo service postgresql restart");
              }
            }
          } else if (errorOutput.includes("password authentication failed")) {
            printEnhancedSection(
              `PostgreSQL Authentication Error: Incorrect password`,
              "error",
            );
            console.log(
              yellow(`The password for user "${DB_USER}" is incorrect.`),
            );
            console.log(
              yellow(
                `Check your .env.development file and update the DB_PASSWORD value.`,
              ),
            );
          } else if (
            errorOutput.includes("role") &&
            errorOutput.includes("does not exist")
          ) {
            printEnhancedSection(
              `PostgreSQL User Error: User does not exist`,
              "error",
            );
            console.log(
              yellow(`The user "${DB_USER}" does not exist in PostgreSQL.`),
            );
            console.log(
              yellow(`Create the user or update DB_USER in .env.development.`),
            );
          } else {
            printEnhancedSection(`Database Seeding Error:`, "error");
            console.log(errorOutput);
          }

          if (attempts < maxAttempts) {
            // Wait before retrying
            const retrySpinner = createSpinner(`Waiting before retry...`);
            await sleep(5000);
            retrySpinner.info(`Retrying database setup...`);
          } else {
            const { continueSetup } = await inquirer.prompt([
              {
                type: "confirm",
                name: "continueSetup",
                message: "Continue setup without demo data?",
                default: true,
              },
            ]);

            if (!continueSetup) {
              printEnhancedSection(
                "Setup aborted due to database issues. You may need to check PostgreSQL configuration.",
                "error",
              );
              process.exit(1);
            }
          }
        }
      }

      if (!seedSuccess) {
        printEnhancedSection(
          "Proceeding without demo data due to database setup issues.",
          "warning",
        );

        // Show manual steps to run the seed
        printEnhancedSection(
          "You can try seeding the database manually later with these steps:\n" +
            "1. Make sure PostgreSQL is running\n" +
            "2. Check your database connection settings in .env.development\n" +
            "3. Run: npm run seed:demo:js\n" +
            "4. For more detailed errors, run: cross-env NODE_ENV=development node src/server/database/seeds/runSeed.mjs",
          "info",
        );
      }
    }
  }

  // Start dev server
  printEnhancedSection("✅ Setup complete!", "success");

  // Verify database settings one last time before starting
  await verifyDatabaseSettings(devEnvPath);

  // Do one final check to make sure we're using the right host
  if (!answers.useDocker) {
    // Explicit, direct file write to ensure DB_HOST is localhost
    printEnhancedSection("Ensuring correct database configuration", "info");
    try {
      let envContent = readFileSync(devEnvPath, "utf8");
      // Always directly set to localhost for non-Docker mode
      envContent = envContent.replace(/DB_HOST=[^\n]+/, "DB_HOST=localhost");
      writeFileSync(devEnvPath, envContent, "utf8");
      console.log(
        green("✓ Database host is set to localhost for local development"),
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(red("Error updating environment file:"), errorMessage);
    }
  }

  console.log(gradient.rainbow("Starting development server...\n"));

  try {
    execSync("npm run dev", { stdio: "inherit" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    printEnhancedSection(
      `Error starting development server: ${errorMessage}`,
      "error",
    );
  }
}

// Function to configure environment files
async function configureEnvironment(
  devEnvPath: string,
  prodEnvPath: string,
  useDocker: boolean,
) {
  printEnhancedSection("🔧 Environment Configuration", "info");

  // First, configure development environment
  await configureDevelopmentEnv(devEnvPath, useDocker);

  // Then ask if user wants to configure production
  const { configureProduction } = await inquirer.prompt([
    {
      type: "confirm",
      name: "configureProduction",
      message: "Do you want to configure production environment variables?",
      default: false,
    },
  ]);

  if (configureProduction) {
    await configureProductionEnv(prodEnvPath);
  }
}

// Function to configure development environment
async function configureDevelopmentEnv(envPath: string, _useDocker: boolean) {
  printEnhancedSection("Configuring development environment...", "info");

  // Database configuration
  const dbConfig = await inquirer.prompt([
    {
      type: "input",
      name: "DB_HOST",
      message: "Database host:",
      default: "localhost",
    },
    {
      type: "input",
      name: "DB_PORT",
      message: "Database port:",
      default: "5432",
    },
    {
      type: "input",
      name: "DB_USER",
      message: "Database user:",
      default: "postgres",
    },
    {
      type: "password",
      name: "DB_PASSWORD",
      message: "Database password:",
      default: "postgres",
    },
    {
      type: "input",
      name: "DB_NAME",
      message: "Database name:",
      default: "abe_stack",
    },
  ]);

  // Server configuration
  const serverConfig = await inquirer.prompt([
    {
      type: "input",
      name: "PORT",
      message: "Server port:",
      default: "8080",
    },
    {
      type: "input",
      name: "API_URL",
      message: "API URL:",
      default: "http://localhost:8080",
    },
    {
      type: "input",
      name: "CLIENT_URL",
      message: "Client URL:",
      default: "http://localhost:3000",
    },
  ]);

  // JWT configuration
  const jwtConfig = await inquirer.prompt([
    {
      type: "input",
      name: "JWT_SECRET",
      message: "JWT secret (for development):",
      default: "dev_jwt_secret_" + Math.random().toString(36).substring(2, 15),
    },
  ]);

  // Update environment file
  Object.entries({ ...dbConfig, ...serverConfig, ...jwtConfig }).forEach(
    ([key, value]) => {
      updateEnvVar(envPath, key, String(value));
    },
  );

  printEnhancedSection("✅ Development environment configured", "success");
}

// Function to configure production environment
async function configureProductionEnv(envPath: string) {
  printEnhancedSection("Configuring production environment...", "info");

  // Database configuration
  const dbConfig = await inquirer.prompt([
    {
      type: "input",
      name: "DB_HOST",
      message: "Production database host:",
      default: "localhost",
    },
    {
      type: "input",
      name: "DB_PORT",
      message: "Production database port:",
      default: "5432",
    },
    {
      type: "input",
      name: "DB_USER",
      message: "Production database user:",
      default: "postgres",
    },
    {
      type: "password",
      name: "DB_PASSWORD",
      message: "Production database password:",
      default: "production_password",
    },
    {
      type: "input",
      name: "DB_NAME",
      message: "Production database name:",
      default: "abe_stack_prod",
    },
  ]);

  // Server configuration
  const serverConfig = await inquirer.prompt([
    {
      type: "input",
      name: "PORT",
      message: "Production server port:",
      default: "8080",
    },
    {
      type: "input",
      name: "API_URL",
      message: "Production API URL:",
      default: "https://api.your-domain.com",
    },
    {
      type: "input",
      name: "CLIENT_URL",
      message: "Production client URL:",
      default: "https://your-domain.com",
    },
  ]);

  // JWT configuration
  const jwtConfig = await inquirer.prompt([
    {
      type: "input",
      name: "JWT_SECRET",
      message: "Production JWT secret:",
      default: "prod_jwt_secret_" + Math.random().toString(36).substring(2, 15),
    },
  ]);

  // Update environment file
  Object.entries({ ...dbConfig, ...serverConfig, ...jwtConfig }).forEach(
    ([key, value]) => {
      updateEnvVar(envPath, key, String(value));
    },
  );

  printEnhancedSection("✅ Production environment configured", "success");
}

// Function to configure local environment after Docker failure
async function configureLocalEnvironment(
  devEnvPath: string,
  _prodEnvPath: string,
) {
  const { configureDb } = await inquirer.prompt([
    {
      type: "confirm",
      name: "configureDb",
      message: "Do you want to configure local database connection?",
      default: true,
    },
  ]);

  if (configureDb) {
    // Update database configuration
    const dbConfig = await inquirer.prompt([
      {
        type: "input",
        name: "DB_HOST",
        message: "Database host:",
        default: "localhost",
      },
      {
        type: "input",
        name: "DB_PORT",
        message: "Database port:",
        default: "5432",
      },
      {
        type: "input",
        name: "DB_USER",
        message: "Database user:",
        default: "postgres",
      },
      {
        type: "password",
        name: "DB_PASSWORD",
        message: "Database password:",
        default: "postgres",
      },
      {
        type: "input",
        name: "DB_NAME",
        message: "Database name:",
        default: "abe_stack",
      },
    ]);

    // Update both environment files
    Object.entries(dbConfig).forEach(([key, value]) => {
      updateEnvVar(devEnvPath, key, String(value));
    });

    printEnhancedSection("✅ Local database configuration updated", "success");
  }
}

// Function to verify database connection settings
async function verifyDatabaseSettings(devEnvPath: string) {
  printEnhancedSection("🔍 Verifying Database Settings", "info");

  try {
    // Read the current settings
    const envContent = readFileSync(devEnvPath, "utf8");
    const hostMatch = envContent.match(/DB_HOST=([^\r\n]+)/);
    const dbHost = hostMatch ? hostMatch[1] : "localhost";

    const spinner = createSpinner(`Checking database configuration...`);

    // For Docker setup
    if (dbHost === "postgres") {
      const dockerRunning = isDockerAvailable();
      if (!dockerRunning) {
        spinner.fail("Docker is not running, but DB_HOST is set to 'postgres'");
        printEnhancedSection("Database Configuration Issue", "warning");
        console.log(
          yellow(
            "Your .env.development file is configured for Docker, but Docker is not running.",
          ),
        );

        const { fixHost } = await inquirer.prompt([
          {
            type: "confirm",
            name: "fixHost",
            message:
              "Would you like to change DB_HOST from 'postgres' to 'localhost'?",
            default: true,
          },
        ]);

        if (fixHost) {
          let content = readFileSync(devEnvPath, "utf8");
          content = content.replace(/DB_HOST=postgres/, "DB_HOST=localhost");
          writeFileSync(devEnvPath, content);
          printEnhancedSection("Updated database host to localhost", "success");
        }
      } else {
        spinner.succeed("Docker is available and DB_HOST is set to 'postgres'");
      }
    }
    // For local PostgreSQL setup
    else if (dbHost === "localhost") {
      if (isPsqlAvailable()) {
        spinner.succeed(
          "PostgreSQL client is available and DB_HOST is set to 'localhost'",
        );
      } else {
        spinner.warn(
          "DB_HOST is set to 'localhost' but PostgreSQL client wasn't detected",
        );
        console.log(
          yellow(
            "Make sure PostgreSQL is properly installed and running on your machine.",
          ),
        );
      }
    }
    // For other setups
    else {
      spinner.info(`Using custom DB_HOST: ${dbHost}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error verifying database settings:", errorMessage);
  }
}

main().catch(console.error);
