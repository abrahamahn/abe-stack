# Contributing to ABE Stack

Thank you for your interest in contributing to ABE Stack! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Development Setup

### Prerequisites

Before you begin, ensure you have:

- Node.js `>=18.19 <25`
- pnpm `10.26.2`
- PostgreSQL (local or Docker)
- Redis (local or Docker)
- Git

### Initial Setup

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/abe-stack.git
   cd abe-stack
   ```

3. Install dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

4. Set up your environment:

   ```bash
   cp config/.env.example config/.env.development
   # Edit config/.env.development with your local settings
   ```

5. Verify everything works:
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm build
   ```

### Running Development Servers

```bash
# All apps
pnpm dev

# Individual apps
pnpm dev:web       # http://localhost:3000
pnpm dev:server    # http://localhost:8080
pnpm dev:desktop
pnpm dev:mobile
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write code following our [code standards](#code-standards)
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run unit tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run E2E tests (if applicable)
pnpm test:e2e
```

### 4. Commit Your Changes

Follow our [commit guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add user profile page"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub following our [PR process](#pull-request-process).

## Code Standards

### TypeScript

- Use strict TypeScript mode (already configured)
- Avoid `any` types - use `unknown` or proper types
- Prefer interfaces for object shapes, types for unions/primitives
- Use explicit return types for public APIs
- Leverage type inference for local variables

**Good:**

```typescript
interface User {
  id: string;
  email: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // implementation
}
```

**Avoid:**

```typescript
function getUser(id: any): any {
  // implementation
}
```

### React Components

- Use functional components with hooks
- Prefer named exports over default exports
- Keep components focused and small
- Extract custom hooks for reusable logic
- Use TypeScript for prop types

**Example:**

```typescript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div>
      <h3>{user.name}</h3>
      {onEdit && <button onClick={() => onEdit(user)}>Edit</button>}
    </div>
  );
}
```

### Naming Conventions

- **Files:** kebab-case for files: `user-profile.tsx`, `api-client.ts`
- **Components:** PascalCase: `UserProfile`, `ApiClient`
- **Functions/Variables:** camelCase: `getUserData`, `isLoading`
- **Constants:** UPPER_SNAKE_CASE: `API_BASE_URL`, `MAX_RETRY_ATTEMPTS`
- **Types/Interfaces:** PascalCase: `UserData`, `ApiResponse`

### Code Organization

- Group related files together
- Keep components close to where they're used
- Shared utilities go in `packages/shared`
- Reusable UI components go in `packages/ui`
- Business logic should be framework-agnostic when possible

### Formatting

- ESLint and Prettier are configured - run `pnpm lint:fix` and `pnpm format`
- Git hooks automatically enforce formatting on commit
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line

## Testing Guidelines

### Unit Tests

- Write tests for all business logic
- Test edge cases and error conditions
- Use descriptive test names that explain the scenario
- Follow the Arrange-Act-Assert pattern

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateTotal } from './cart-utils';

describe('calculateTotal', () => {
  it('should return 0 for empty cart', () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });

  it('should sum item prices correctly', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 },
    ];
    const result = calculateTotal(items);
    expect(result).toBe(25);
  });
});
```

### Coverage Requirements

- Maintain minimum 70% coverage for all metrics
- New features should include tests
- Coverage reports are generated in `coverage/` directory

### E2E Tests

- Write E2E tests for critical user flows
- Place E2E tests in `tests/e2e/`
- Use Playwright's best practices
- Keep E2E tests stable and deterministic

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring (no functionality change)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD configuration changes

### Examples

```
feat(auth): add OAuth login support

Implemented OAuth 2.0 authentication flow with Google and GitHub providers.
Added user profile sync on first login.

Closes #123
```

```
fix(api): handle rate limit errors correctly

Previously, rate limit errors would crash the server.
Now they return a proper 429 response with retry-after header.
```

```
docs(readme): update installation instructions
```

### Scope

The scope is optional and indicates which part of the codebase is affected:

- `auth` - Authentication related
- `api` - API/server related
- `ui` - UI components
- `db` - Database/ORM related
- `web` - Web app
- `desktop` - Desktop app
- `mobile` - Mobile app

## Pull Request Process

### Before Submitting

1. Ensure all tests pass: `pnpm test`
2. Ensure linting passes: `pnpm lint`
3. Ensure type-checking passes: `pnpm type-check`
4. Update relevant documentation
5. Add tests for new features
6. Rebase on latest main if needed

### PR Title

Use the same format as commit messages:

```
feat(auth): add OAuth login support
```

### PR Description Template

```markdown
## Description

Brief description of the changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made

- List specific changes
- One per line

## Testing Done

- Describe how you tested the changes
- Include test coverage if applicable

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer approval required
3. Address review feedback
4. Squash commits if requested
5. Maintainer will merge when approved

### After Merge

- Delete your feature branch
- Pull latest main: `git checkout main && git pull`
- Thank reviewers!

## Project Structure

### Monorepo Organization

```
abe-stack/
├── apps/                    # Applications
│   ├── web/                 # React web app
│   ├── server/              # Fastify API
│   ├── desktop/             # Electron app
│   └── mobile/              # React Native app
├── packages/                # Shared packages
│   ├── api-client/          # Type-safe API client
│   ├── db/                  # Database schemas
│   ├── shared/              # Shared utilities
│   └── ui/                  # UI component library
├── config/                  # Build and test configs
├── tools/                   # Developer tools
└── .github/                 # GitHub workflows
```

### Adding New Packages

1. Create package directory: `packages/your-package/`
2. Add `package.json` with workspace scope: `@abe-stack/your-package`
3. Add to root `pnpm-workspace.yaml` if needed
4. Run `pnpm install` to link workspace dependencies

### Workspace Dependencies

Reference workspace packages in `package.json`:

```json
{
  "dependencies": {
    "@abe-stack/shared": "workspace:*"
  }
}
```

## Getting Help

- **Questions:** Open a [GitHub Discussion](https://github.com/your-org/abe-stack/discussions)
- **Bugs:** Open a [GitHub Issue](https://github.com/your-org/abe-stack/issues)
- **Security:** Email security@your-domain.com

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions
- Help others learn and grow

---

Thank you for contributing to ABE Stack!
