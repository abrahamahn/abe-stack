# 🔐 Environment Files

This directory contains all environment variable files for ABE Stack. The configuration system loads and validates these files before the application starts.

## 🚀 Quick Start for New Users

**First time setup:**

1. Copy the example files and remove `.example` from the filenames:

   ```bash
   cp .config/env/.env.development.example .config/env/.env.development
   cp .config/env/.env.local.example .config/env/.env.local
   ```

2. Start developing immediately - the defaults work out of the box:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Customize as needed by editing `.config/env/.env.local` with your preferences

> **Note:** The four main env files (`.env.development`, `.env.production`, `.env.test`, `.env.local`) are gitignored for security.

## 📁 File Structure

```
.config/env/
├── .env.development.example  # Template for development
├── .env.production.example   # Template for production
├── .env.test.example         # Template for testing
└── .env.local.example        # Template for local overrides
```

## 🔄 Loading Priority

Environment variables are loaded in this order (highest to lowest priority):

1. **System Environment** - Runtime variables (Vercel, AWS, Docker, etc.)
2. **ENV_FILE** - Explicit file path via `ENV_FILE` environment variable
3. **`.env.local`** - Local developer overrides (config directory)
4. **`.env.{NODE_ENV}`** - Stage-specific (config directory)
5. **`.env`** - Base configuration (config directory, if exists)
6. **Root fallbacks** - `.env.local`, `.env.{NODE_ENV}`, and `.env` in repo root (if exists)

> **Note:** Variables set in higher priority sources will NOT be overwritten by lower priority sources.

## 📝 File Descriptions

### `.env.development`

**Purpose:** Default settings for local development

**Includes:** PostgreSQL database, local cache, console email, local file storage

**Optimized for:** Zero-infrastructure setup - works immediately after cloning

**When to use:** Running `pnpm dev` or `NODE_ENV=development`

### `.env.production`

**Purpose:** Production-ready configuration

**Requires:** PostgreSQL database, SMTP email provider, cloud storage (S3)

**Security:** SSL enabled, strong secrets required, localhost URLs disabled

**When to use:** Production deployments, `NODE_ENV=production`

**Customization:** You must configure cloud provider credentials and production URLs

### `.env.test`

**Purpose:** Test environment configuration

**Includes:** In-memory databases, mocked services, fast execution settings

**When to use:** Running tests with `pnpm test`

**Note:** Tracked in git for consistent test environments across team

### `.env.local`

**Purpose:** Your personal development overrides

**Use this for:**

- Local database credentials
- API keys for testing third-party services
- Debug settings and feature flags
- Any secrets that should never be committed

**Security:** ❌ Never tracked in git (in `.gitignore`)

**When to use:** Always! Copy from `.env.local.example` and customize for your machine

## 🔧 Advanced Usage

### Using a Specific Environment File

```bash
# Use a custom env file
ENV_FILE=.config/env/.env.staging pnpm dev

# Or set it in your shell
export ENV_FILE=.config/env/.env.custom
pnpm dev
```

### Creating Custom Environments

```bash
# Create a staging environment
cp .config/env/.env.production.example .config/env/.env.staging

# Edit staging-specific values
nano .config/env/.env.staging

# Use it
NODE_ENV=staging ENV_FILE=.config/env/.env.staging pnpm dev
```

## 🔒 Security Best Practices

### ✅ DO

- Keep `.env.*` in `.gitignore` (already configured)
- Use strong secrets (32+ characters) for production
- Rotate secrets regularly (at least quarterly)
- Use different secrets for each environment
- Document all variables in `.example` files
- Use environment-specific values (dev vs prod)

### ❌ DON'T

- Commit `.env.local` to git
- Commit real secrets to `.env.development` or `.env.production`
- Use development secrets in production
- Share secrets via Slack/email/chat
- Hardcode secrets in source code
- Use weak or default secrets in production

## 📚 Related Documentation

- **Configuration System:** [packages/core/src/config/README.md](/packages/core/src/config/README.md)
- **Server Config:** [apps/server/src/config/README.md](/apps/server/src/config/README.md)
- **Environment Variables:** [docs/deploy/env.md](/docs/deploy/env.md)

## 🛠 Troubleshooting

### "Environment Validation Failed"

The configuration system validates all environment variables on startup. If you see this error:

1. Check which variable is missing or invalid (shown in error message)
2. Compare your `.env.local` with `.env.local.example`
3. Ensure required variables are set for your environment
4. Check variable formats (URLs should include protocol, ports should be numbers, etc.)

### "Cannot find .config directory"

The loader searches up to 5 parent directories for `.config/`. Ensure you're running commands from the repository root or a subdirectory.

### Variables Not Loading

Check the priority order above. Higher priority sources override lower ones. Debug with:

```javascript
// Add after imports in your entry file
import { initEnv } from '@abe-stack/core/config';
initEnv();
console.log('MY_VAR:', process.env.MY_VAR);
```

### Database Connection Issues

**Development:** Ensure PostgreSQL is running locally:

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

**Production:** Verify `DATABASE_URL` is set correctly in your deployment platform's environment variables.
