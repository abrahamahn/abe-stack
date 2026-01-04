# Contributing to ABE Stack

Thank you for your interest in contributing to ABE Stack! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Architecture Guidelines](#architecture-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/abe-stack.git`
3. Add upstream remote: `git remote add upstream https://github.com/abrahamahn/abe-stack.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js `>=18.19 <25`
- pnpm `10.26.2` (via corepack)
- PostgreSQL (local or Docker)
- Redis (local or Docker)

### Installation

```bash
# Enable corepack for pnpm
corepack enable
corepack prepare pnpm@10.26.2 --activate

# Install dependencies
pnpm install

# Copy environment config
cp config/.env.example config/.env.development

# Start development servers
pnpm dev
```

### Docker Alternative

```bash
docker compose -f config/docker/docker-compose.yml up --build
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-user-preferences` - New features
- `fix/login-redirect-loop` - Bug fixes
- `refactor/simplify-auth-flow` - Code improvements
- `docs/update-api-reference` - Documentation

### Commit Messages

Write clear, concise commit messages:

```
<type>: <description>

[optional body with more details]

[optional footer]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`

Examples:

- `feat: add password reset functionality`
- `fix: prevent duplicate form submissions`
- `refactor: extract auth logic to shared package`

### Guardrails

- If format/lint/type-check/test failures are pre-existing or unrelated, do not auto-fix them; report them clearly and keep scope focused
- Only commit changes directly related to your feature/fix
- Avoid "drive-by" fixes in unrelated code

## Pull Request Process

1. **Ensure your branch is up to date:**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks locally:**

   ```bash
   pnpm format      # Format code
   pnpm lint        # Lint check
   pnpm type-check  # TypeScript check
   pnpm test        # Run tests
   ```

3. **Push your changes:**

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to any related issues
   - Screenshots for UI changes

5. **Address review feedback** promptly and respectfully

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated for new functionality
- [ ] Documentation updated if needed
- [ ] All CI checks pass
- [ ] No unrelated changes included

## Code Style

### Enforced by Tooling

- **Prettier** - Code formatting (run with `pnpm format`)
- **ESLint** - Linting rules (run with `pnpm lint`)
- **TypeScript** - Strict type checking (run with `pnpm type-check`)

### Git Hooks

Pre-commit and pre-push hooks automatically check:

- Formatting (Prettier)
- Linting (ESLint)
- Type checking (TypeScript)

### Style Guidelines

- Use TypeScript strict mode
- Prefer named exports over default exports
- Use `type` for type aliases, `interface` for object shapes that may be extended
- Keep functions small and focused
- Use descriptive variable names

## Testing

### Running Tests

```bash
# All tests
pnpm test

# With coverage
pnpm test -- --coverage

# Watch mode (specific package)
pnpm --filter @abe-stack/ui test -- --watch

# E2E tests
pnpm test:e2e
```

### Writing Tests

- Place unit tests next to source files: `Component.tsx` → `__tests__/Component.test.tsx`
- Use descriptive test names: `it('shows error message when login fails')`
- Test behavior, not implementation
- Mock external dependencies appropriately

### Test Coverage

- New features should include tests
- Bug fixes should include regression tests
- Aim for meaningful coverage, not 100% line coverage

## Architecture Guidelines

### Package Structure

```
apps/*     → Thin renderers (React, Electron, RN)
            ↓
packages/  → Real logic lives here
   ├── shared/      → Business rules, types, validation (framework-agnostic)
   ├── ui/          → Reusable components
   ├── api-client/  → Type-safe API contract
   └── db/          → Drizzle schemas & queries
```

### Key Principles

1. **Shared logic in packages/** - Apps should be thin renderers
2. **Framework-agnostic core** - Business logic shouldn't depend on React
3. **Type-safe boundaries** - Use ts-rest contracts between client/server
4. **No framework lock-in** - Changing UI frameworks should only touch `apps/`

### Adding New Packages

1. Create package in `packages/` with standard structure
2. Add to pnpm workspace
3. Configure tsconfig to extend base config
4. Add to turbo.json build pipeline
5. Export from package index

### UI Component Guidelines

Components in `packages/ui` should:

- Be framework-agnostic where possible
- Use CSS variables from `theme.css`
- Include accessibility attributes
- Have corresponding tests and documentation

## Questions?

- Open a [GitHub Issue](https://github.com/abrahamahn/abe-stack/issues) for bugs or feature requests
- Check existing issues before creating new ones
- Use issue templates when available

Thank you for contributing!
