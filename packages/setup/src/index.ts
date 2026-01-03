#!/usr/bin/env node
/* eslint-disable no-console */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';
import { program } from 'commander';
import degit from 'degit';
import ora from 'ora';
import prompts from 'prompts';

const REPO = 'abrahamahn/abe-stack';
const DEFAULT_BRANCH = 'main';

interface ProjectConfig {
  projectName: string;
  projectDir: string;
  packageScope: string;
}

async function getProjectConfig(projectNameArg?: string): Promise<ProjectConfig> {
  let projectName: string;

  if (projectNameArg) {
    projectName = projectNameArg;
  } else {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'What is your project named?',
      initial: 'my-app',
      validate: (value: string) => {
        if (!value) return 'Project name is required';
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Project name can only contain lowercase letters, numbers, and hyphens';
        }
        return true;
      },
    });

    if (!response.projectName || typeof response.projectName !== 'string') {
      console.log(chalk.red('Project name is required'));
      process.exit(1);
    }

    projectName = response.projectName;
  }

  const projectDir = path.resolve(process.cwd(), projectName);

  // Convert project name to package scope (e.g., my-app -> @my-app)
  const packageScope = `@${projectName}`;

  return { projectName, projectDir, packageScope };
}

function validateDirectory(projectDir: string, projectName: string): void {
  if (fs.existsSync(projectDir)) {
    const files = fs.readdirSync(projectDir);
    if (files.length > 0) {
      console.log(
        chalk.red(
          `\nError: Directory ${chalk.cyan(projectName)} already exists and is not empty.\n`,
        ),
      );
      process.exit(1);
    }
  }
}

async function cloneTemplate(projectDir: string): Promise<void> {
  const spinner = ora('Downloading template...').start();

  try {
    const emitter = degit(REPO, {
      cache: false,
      force: true,
      verbose: false,
    });

    await emitter.clone(projectDir);
    spinner.succeed('Template downloaded');
  } catch (error) {
    spinner.fail('Failed to download template');
    throw error;
  }
}

function updatePackageJson(filePath: string, updates: Record<string, unknown>): void {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  const updated: Record<string, unknown> = { ...content, ...updates };
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
}

function replaceInFile(filePath: string, replacements: [RegExp | string, string][]): void {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(filePath, content);
}

function transformProject(config: ProjectConfig): void {
  const spinner = ora('Configuring project...').start();

  const { projectDir, projectName, packageScope } = config;

  // Update root package.json
  updatePackageJson(path.join(projectDir, 'package.json'), {
    name: `${packageScope}/root`,
    description: `${projectName} - Built with ABE Stack`,
  });

  // Update app package.json files
  const appMappings: [string, string][] = [
    ['apps/web/package.json', `${packageScope}/web`],
    ['apps/server/package.json', `${packageScope}/server`],
    ['apps/desktop/package.json', `${packageScope}/desktop`],
    ['apps/mobile/package.json', `${packageScope}/mobile`],
  ];

  for (const [file, name] of appMappings) {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      updatePackageJson(filePath, { name });
    }
  }

  // Update package references in files
  const filesToUpdate = [
    'apps/web/package.json',
    'apps/server/package.json',
    'apps/desktop/package.json',
    'apps/mobile/package.json',
    'turbo.json',
  ];

  const replacements: [RegExp, string][] = [
    [/@abe-stack\//g, `${packageScope}/`],
    [/abeahn-/g, `${projectName}-`],
  ];

  for (const file of filesToUpdate) {
    replaceInFile(path.join(projectDir, file), replacements);
  }

  // Update package names in packages/
  const packageMappings: [string, string][] = [
    ['packages/shared/package.json', `${projectName}-shared`],
    ['packages/ui/package.json', `${projectName}-ui`],
    ['packages/api-client/package.json', `${projectName}-api-client`],
    ['packages/db/package.json', `${projectName}-db`],
    ['packages/storage/package.json', `${projectName}-storage`],
  ];

  for (const [file, name] of packageMappings) {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      updatePackageJson(filePath, { name });
    }
  }

  // Clean up template-specific files
  const filesToRemove = [
    '.git',
    'packages/setup', // Remove the setup package itself
    'CHANGELOG.md',
  ];

  for (const file of filesToRemove) {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  }

  spinner.succeed('Project configured');
}

function initGit(projectDir: string): void {
  const spinner = ora('Initializing git repository...').start();

  try {
    execSync('git init', { cwd: projectDir, stdio: 'ignore' });
    execSync('git add -A', { cwd: projectDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit from create-abe-app"', {
      cwd: projectDir,
      stdio: 'ignore',
    });
    spinner.succeed('Git repository initialized');
  } catch {
    spinner.warn('Git initialization skipped (git not available)');
  }
}

function printSuccess(config: ProjectConfig): void {
  const { projectName } = config;

  console.log();
  console.log(chalk.green('Success!'), `Created ${chalk.cyan(projectName)}`);
  console.log();
  console.log('Next steps:');
  console.log();
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan('  pnpm install'));
  console.log(chalk.cyan('  pnpm dev'));
  console.log();
  console.log('Or start with Docker:');
  console.log();
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan('  docker compose -f config/docker/docker-compose.yml up --build'));
  console.log();
}

async function main(): Promise<void> {
  console.log();
  console.log(chalk.bold('Create ABE App'));
  console.log(chalk.dim('TypeScript monorepo with web, desktop, mobile, and server'));
  console.log();

  program
    .name('create-abe-app')
    .description('Create a new ABE Stack project')
    .argument('[project-name]', 'Name of the project')
    .option('-b, --branch <branch>', 'Git branch to use', DEFAULT_BRANCH)
    .action(async (projectNameArg: string | undefined) => {
      try {
        const config = await getProjectConfig(projectNameArg);

        validateDirectory(config.projectDir, config.projectName);

        await cloneTemplate(config.projectDir);
        transformProject(config);
        initGit(config.projectDir);

        printSuccess(config);
      } catch (error) {
        console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch(console.error);
