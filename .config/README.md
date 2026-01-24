# Configuration Files (`.config/`)

This hidden directory contains all tool-specific configurations for the development tools used in the Abe-Stack.

## Contents

- `tsconfig.*.json` - TypeScript compiler configurations for different contexts
- `vite.config.ts` - Vite build tool configuration
- `vitest.config.ts` - Vitest testing framework configuration
- `playwright.config.ts` - Playwright E2E testing configuration

## Purpose

Moving tool-specific configurations to `.config/` keeps the root directory clean and focused on the main application structure (`apps/`, `packages/`). This follows modern monorepo patterns used by high-end stacks and improves scannability.

## Usage

These configurations are automatically picked up by their respective tools. When adding new tools, their configurations should also be placed here to maintain consistency.
