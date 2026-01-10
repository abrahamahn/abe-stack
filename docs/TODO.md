# TODO: Boilerplate Delivery Plan

Guide to make the monorepo production-ready while keeping the renderer-agnostic philosophy (React/React Native/Electron-Tauri as view layers only).

Last Updated: 2026-01-04

## 1) Foundations & DX

- [x] Confirm Node/pnpm versions align with repo policy (`>=18.19 <25`, `pnpm@10.26.2`).
- [x] Harden env loading (`dotenv-flow`) and examples (`config/.env.*`) with required keys for server, email, DB, and client origins.
- [x] Ensure `pnpm install` succeeds on clean checkout (no optional native deps breaking CI).
- [x] Add dev bootstrap script to start DB (docker-compose) and run migrations/seed.
- [x] Wire CI (lint, type-check, test, build) via GitHub Actions (or target CI).
- [x] Cache strategy for Turbo/PNPM in CI.

## 2) Frontend (Web + Shared UI)

### packages/ui (Reusable UI Library)

- [x] Audit and align elements/components with industry best practices (accessibility, keyboard nav, ARIA, focus management).
- [x] Standardize component APIs (controlled/uncontrolled patterns, polymorphic typing where needed).
- [x] Expand documentation examples for each component (usage, props, do/don't).
- [x] Add missing UI tests for critical behaviors (a11y, keyboard interactions, focus traps).
- [x] Ensure theme tokens cover spacing, typography, color, and motion consistently.
- [x] Publishable DX: consistent exports, tree-shakeable entrypoints, and clear versioning notes.
- [x] (2026-01-01) Install modern React testing stack (user-event, msw, vitest-axe).
- [x] (2026-01-01) Enhanced 21+ element component tests with comprehensive coverage.
- [x] (2026-01-01) Found and fixed Image component bug through TDD (state reset on src change).
- [x] (2026-01-04) Reorganize file structure: components/elements/layouts properly classified.
- [x] (2026-01-04) Set up path aliases (@components, @elements, @hooks, @layouts, @styles, @test, @theme, @utils).
- [x] (2026-01-04) Update docs to match new file locations.
- [x] Add missing tests for LeftSidebarLayout and RightSidebarLayout.

### Demo Surface (Live UI Gallery)

- [x] Implement a dedicated `/features/demo` page that showcases every `packages/ui` component in live, interactive states.
- [x] Build a resizable pane layout shell (top/bottom/left/right/center) with mouse drag handles and toggles per pane; persist sizes per user.
- [x] Center pane renders the active demo; side panes host component docs, prop tables, and usage notes.
- [x] Top bar: category tabs (elements, components, hooks, layouts, test, theme, utils) that filter the catalog.
- [x] Component registry: map each component to demos, states, props schema, and related docs.
- [x] Demo cards include live controls (props knobs), copyable snippets, and notes for do/don't.
- [x] Cover primary/secondary/disabled/loading/error/empty states for each component where applicable.
- [x] Include layout variations (stack, split, grid, dock, modal, drawer, sheet, tabs) and responsive breakpoints.
- [x] Add interactive UX examples that combine components (forms, search, data table, wizard, auth, notifications).
- [x] Theme controls: light/dark and density toggles; place the theme switch in the bottom pane with live preview.
- [x] Keyboard accessibility pass for demo navigation and resize handles; document shortcuts.
- [x] In-app docs panel links to related `docs/dev` guidance where relevant.
- [x] Split large demo registry file (~1500 lines) into modular files per category.
- [x] Performance: lazy load registry by category for faster initial load.

## 3) Backend (Fastify + Drizzle + Postgres)

- [x] Serve routes via `@ts-rest/fastify` using the shared contract to keep server/client in lockstep.
- [x] Define DB schema in `packages/db/src/schema` (users, sessions, verification tokens, audit tables).
- [x] Migrations: generate and run via `drizzle-kit`; add `pnpm db:migrate` + `pnpm db:push`.
- [x] Seed script for local dev users and feature toggles.
- [x] Auth flows: signup, login, logout, refresh, password reset, email verification token issuance/validation.
- [x] (2026-01-03) Complete auth system with refresh tokens and roles (access/refresh tokens, role-based middleware).
- [ ] Email service abstraction (provider-agnostic); add local stub transporter + templates.
- [ ] Input validation with Zod; consistent error envelope and status codes.
- [ ] Rate limiting + CORS + Helmet defaults; request logging.
- [ ] Health checks and readiness endpoints.
- [ ] API versioning and OpenAPI/typed client generation hookup (align with `packages/api-client`).

## 4) Frontend (Web)

- [x] Home shell with resizable panes (top/bottom/left/right/main); persist layout state.
- [x] Auth screens (signup/login/forgot/reset/verify email) wired to API client.
- [x] Global query/state setup (React Query), theming, and router guard logic.
- [x] (2026-01-03) AppProviders component consolidating QueryClient, Auth, API, History providers.
- [x] (2026-01-03) ThemeProvider with useTheme hook, localStorage persistence, cycleMode.
- [ ] Error boundary + toasts/snackbars for API errors.
- [ ] Accessibility pass (focus management, keyboard resize handles).
- [ ] E2E happy path (Playwright) for auth and layout resize persistence.

## 5) Desktop (Electron, Tauri-ready)

## 6) Shared Packages

- [x] `packages/api-client`: align with server routes, re-export types, handle auth headers/refresh, response normalization.
- [x] `packages/ui`: shared components (buttons, inputs, layout elements, pane resizers), theme tokens, dark/light support.
- [x] `packages/shared`: domain types, validation schemas, utilities (date, money, feature flags), logging helpers.
- [x] `packages/db`: ensure schema exports are tree-shakeable; publish/consume pattern documented.
- [ ] Generate fetch/React Query clients from the shared ts-rest contract for web/desktop/mobile consumption.

## 8) Infrastructure & Ops

- [ ] Dockerfile/docker-compose for server + Postgres + maildev (dev).
- [ ] Production Postgres settings guidance (connection pooling, SSL).
- [ ] Secrets management note (env, Vault, SSM).
- [ ] Observability hooks: request logs, basic metrics, and error reporting placeholders.
- [ ] Backups/retention plan for DB (documented checklist).

## 9) Security & Compliance

- [x] Password policy + bcrypt cost tuning; account lockout/backoff on brute force.
- [ ] CSRF story (mainly for web forms if cookies are used), CORS allowlist.
- [ ] Input validation coverage; output encoding where needed.
- [ ] Dependencies audit (pnpm audit or npm audit-lite) and update cadence.
- [ ] GDPR-ready data export/delete stubs (documented).

---

## 13) Authentication Strategy (January 2026)

Comprehensive, modern authentication architecture using Passport.js as the core middleware. This strategy provides flexibility without external dependencies, supporting multiple auth methods that can be enabled/disabled via configuration.

**Last Updated:** 2026-01-09

### Why Passport.js?

- Still the go-to authentication middleware in 2026 for custom Node apps
- Flexible, unobtrusive, with 500+ strategies
- Integrates seamlessly with Express/Fastify
- Enable/disable strategies via config for plug-and-play
- No vendor lock-in—pure self-hosted, customizable

### Supported Authentication Methods

All methods implemented as separate Passport.js strategies. Enable via config (e.g., `AUTH_STRATEGIES=local,magic,webauthn,google`):

| Method              | Package                                         | Status | Notes                                                 |
| ------------------- | ----------------------------------------------- | ------ | ----------------------------------------------------- |
| Password-based      | `passport-local`                                | [ ]    | Email + password with Argon2id hashing                |
| Magic Links         | `passport-magic-link` or `passport-magic-login` | [ ]    | Passwordless email links with signed, expiring tokens |
| Passkeys (WebAuthn) | `passport-webauthn`                             | [ ]    | FIDO2/passkeys—phishing-resistant, biometric/PIN      |
| Google OAuth        | `passport-google-oauth20`                       | [ ]    | Social login                                          |
| GitHub OAuth        | `passport-github`                               | [ ]    | Social login                                          |
| Apple OAuth         | `passport-apple`                                | [ ]    | Social login                                          |
| TOTP (2FA)          | `passport-totp` + `speakeasy`                   | [ ]    | Optional MFA add-on                                   |

### Core Architecture

#### Session Management

- [ ] Use `express-session` with secure store (Redis for production, memory for dev)
- [ ] Store sessions server-side (not JWT-only sessions)
- [ ] Session cookie settings: `HttpOnly`, `Secure`, `SameSite=Strict`

#### Token Strategy (for APIs/SPAs)

| Token Type         | Storage                                          | Expiry     | Details                            |
| ------------------ | ------------------------------------------------ | ---------- | ---------------------------------- |
| Access Token (JWT) | HttpOnly cookie (preferred) or short-term memory | 15 minutes | Contains `userId`, `email`, `role` |
| Refresh Token      | HttpOnly cookie + DB                             | 7 days     | Opaque 64-byte random string       |

- [ ] **Token Rotation**: Issue new refresh token on each use, invalidate old one
- [ ] **Reuse Detection**: Track token family in DB; if rotated-out token is reused, revoke entire family (signals theft)
- [ ] **Grace Period**: Allow 30-second window for old token (handles network interruptions)

#### BFF (Backend-for-Frontend) Pattern Option

- [ ] Add toggleable proxy endpoint for API calls
- [ ] Keeps tokens fully server-side (browser only gets session cookie)
- [ ] Mitigates XSS completely—tokens never touch browser
- [ ] Recommended for sensitive applications (healthcare, financial)

### Security Hardening Tasks

#### Password Hashing Migration

- [ ] **Upgrade to Argon2id** (via `argon2` npm package)
  - Minimum params: 19 MiB memory, 2 iterations, 1 parallelism
  - More GPU-resistant than bcrypt
  - No 72-byte input limit (unlike bcrypt)
- [ ] **Legacy bcrypt migration**: Re-hash passwords on successful login
  ```typescript
  // On login, if hash starts with '$2' (bcrypt), re-hash with Argon2id
  if (storedHash.startsWith('$2') && (await bcrypt.compare(password, storedHash))) {
    const newHash = await argon2.hash(password, argon2Options);
    await updateUserPasswordHash(userId, newHash);
  }
  ```

#### Rate Limiting

- [ ] Install `@fastify/rate-limit` (or `express-rate-limit` for Express)
- [ ] Configure per-endpoint limits:

| Endpoint                | Limit       | Window     | Key        |
| ----------------------- | ----------- | ---------- | ---------- |
| `/auth/login`           | 5 attempts  | 15 minutes | IP + email |
| `/auth/register`        | 3 attempts  | 1 hour     | IP         |
| `/auth/forgot-password` | 3 attempts  | 1 hour     | IP + email |
| `/auth/verify-email`    | 10 attempts | 1 hour     | IP         |

#### Account Lockout & Monitoring

- [ ] Progressive delays after failed attempts (1s, 2s, 4s, 8s...)
- [ ] Temporary lock after 10 failures (30 minutes, not permanent—avoids DoS)
- [ ] Log all authentication attempts with metadata:
  - Timestamp, IP, user agent, success/failure, failure reason
- [ ] Alert on anomalies (multiple IPs, rapid failures, geographic impossibilities)

#### Password Complexity

- [ ] Integrate `zxcvbn` for entropy-based password strength checking
- [ ] Minimum requirements:
  - At least 8 characters (NIST recommends up to 64 max)
  - zxcvbn score ≥ 3 (out of 4)
  - Check against common password lists
- [ ] No arbitrary complexity rules (e.g., "must have symbol")—NIST discourages these

#### CSRF Protection

- [ ] Implement double-submit cookie pattern or `csurf` middleware
- [ ] Apply to all state-changing endpoints
- [ ] Ensure `SameSite=Strict` on auth cookies

#### Security Headers (Helmet.js)

- [x] Basic Helmet.js configured
- [ ] Audit and harden CSP (Content Security Policy)
- [ ] Enable HSTS with long max-age
- [ ] Configure `X-Frame-Options`, `X-Content-Type-Options`

### Database Schema Updates

#### New Tables Required

```sql
-- Refresh token family tracking (for reuse detection)
CREATE TABLE refresh_token_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT
);

-- Enhanced refresh tokens
ALTER TABLE refresh_tokens ADD COLUMN family_id UUID REFERENCES refresh_token_families(id);
ALTER TABLE refresh_tokens ADD COLUMN previous_token_id UUID;

-- WebAuthn credentials (for passkeys)
CREATE TABLE webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  counter INTEGER DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Magic link tokens
CREATE TABLE magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login attempts (for rate limiting & lockout)
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth connections
CREATE TABLE oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'github', 'apple'
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);
```

### Configuration Example

```typescript
// config/auth.ts
export const authConfig = {
  // Enable/disable strategies via env
  strategies: (process.env.AUTH_STRATEGIES || 'local').split(','),

  // Password hashing (Argon2id)
  argon2: {
    type: 2, // argon2id
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  },

  // Token expiry
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  refreshTokenGracePeriod: 30, // seconds

  // Rate limiting
  rateLimit: {
    login: { max: 5, windowMs: 15 * 60 * 1000 },
    register: { max: 3, windowMs: 60 * 60 * 1000 },
    forgotPassword: { max: 3, windowMs: 60 * 60 * 1000 },
  },

  // Account lockout
  lockout: {
    maxAttempts: 10,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    progressiveDelay: true,
  },

  // Password policy
  password: {
    minLength: 8,
    maxLength: 64,
    minZxcvbnScore: 3,
  },

  // BFF mode (tokens never in browser)
  bffMode: process.env.AUTH_BFF_MODE === 'true',

  // OAuth providers (only if strategy enabled)
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
};
```

### Passport.js Setup Example

```typescript
// lib/passport.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as WebAuthnStrategy } from 'passport-webauthn';
import { Strategy as MagicLinkStrategy } from 'passport-magic-link';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import argon2 from 'argon2';
import { authConfig } from '../config/auth';

const strategies = authConfig.strategies;

// Password-based authentication
if (strategies.includes('local')) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);
        if (!user) return done(null, false, { message: 'Invalid credentials' });

        // Check lockout
        if (await isAccountLocked(user.id)) {
          return done(null, false, { message: 'Account temporarily locked' });
        }

        // Verify password (handles both Argon2id and legacy bcrypt)
        const isValid = await verifyPassword(password, user.passwordHash);

        // Log attempt
        await logLoginAttempt(email, isValid);

        if (!isValid) return done(null, false, { message: 'Invalid credentials' });

        // Migrate bcrypt to Argon2id on successful login
        if (user.passwordHash.startsWith('$2')) {
          const newHash = await argon2.hash(password, authConfig.argon2);
          await updateUserPasswordHash(user.id, newHash);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );
}

// Passkeys (WebAuthn) - 2026 gold standard
if (strategies.includes('webauthn')) {
  passport.use(
    new WebAuthnStrategy(
      {
        rpID: process.env.WEBAUTHN_RP_ID,
        rpName: process.env.WEBAUTHN_RP_NAME,
        origin: process.env.WEBAUTHN_ORIGIN,
      },
      // Registration verification
      async (id, publicKey, done) => {
        /* ... */
      },
      // Authentication verification
      async (id, userHandle, done) => {
        /* ... */
      },
    ),
  );
}

// Magic links (passwordless)
if (strategies.includes('magic')) {
  passport.use(
    new MagicLinkStrategy(
      {
        secret: process.env.MAGIC_LINK_SECRET,
        userFields: ['email'],
        tokenField: 'token',
        ttl: 15 * 60, // 15 minutes
      },
      // Send email with magic link
      async (user, token) => {
        /* ... */
      },
      // Verify and find user
      async (user) => {
        /* ... */
      },
    ),
  );
}

// Google OAuth
if (strategies.includes('google')) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: authConfig.oauth.google.clientId!,
        clientSecret: authConfig.oauth.google.clientSecret!,
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        const user = await findOrCreateOAuthUser('google', profile);
        return done(null, user);
      },
    ),
  );
}

// Session serialization
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  const user = await findUserById(id);
  done(null, user);
});

export default passport;
```

### Implementation Checklist

#### Phase 1: Security Hardening (Critical) ✅ COMPLETED - ALL A+

- [x] Migrate password hashing from bcrypt to Argon2id (apps/server/src/lib/password.ts)
- [x] Implement rate limiting on auth endpoints (via login attempt tracking + @fastify/rate-limit plugin)
- [x] Add login attempt logging (apps/server/src/lib/security.ts, uses loginAttempts table)
- [x] Implement account lockout with progressive delays (apps/server/src/lib/security.ts)
- [x] Add password strength validation with zxcvbn (apps/server/src/routes/index.ts, using validatePassword)
- [x] Implement refresh token rotation with reuse detection (apps/server/src/lib/refresh-token.ts)
- [x] Add CSRF protection (@fastify/csrf-protection with double-submit cookie pattern, apps/server/src/server.ts)

#### Phase 2: Passport.js Integration

- [ ] Install and configure Passport.js with Fastify adapter
- [ ] Implement `passport-local` strategy (replace current auth)
- [ ] Add session management with secure cookie store
- [ ] Create strategy enable/disable configuration
- [ ] Update auth routes to use Passport.js

#### Phase 3: Additional Auth Methods

- [ ] Implement `passport-magic-link` for passwordless email auth
- [ ] Implement `passport-webauthn` for passkeys (FIDO2)
- [ ] Add WebAuthn registration/authentication UI flows
- [ ] Create passkey management UI (list, rename, delete)

#### Phase 4: Social/OAuth Providers

- [ ] Implement Google OAuth (`passport-google-oauth20`)
- [ ] Implement GitHub OAuth (`passport-github`)
- [ ] Implement Apple OAuth (`passport-apple`)
- [ ] Add OAuth connection management UI
- [ ] Handle account linking (connect multiple providers to one account)

#### Phase 5: Advanced Features

- [ ] Implement TOTP 2FA (`passport-totp` + `speakeasy`)
- [ ] Add BFF proxy mode for maximum security
- [ ] Implement step-up authentication for sensitive operations
- [ ] Add device/session management UI
- [ ] Implement "remember this device" functionality

### Testing Requirements

- [ ] Unit tests for Argon2id hashing and bcrypt migration
- [ ] Integration tests for each Passport strategy
- [ ] Rate limiting tests (verify lockout behavior)
- [ ] Token rotation and reuse detection tests
- [ ] E2E tests for complete auth flows (login, register, OAuth, passkeys)
- [ ] Security audit: OWASP testing guide compliance

### References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Auth0: Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [Ping Identity: Refresh Token Rotation in SPAs](https://www.pingidentity.com/en/resources/blog/post/refresh-token-rotation-spa.html)
- [NIST Digital Identity Guidelines (SP 800-63B)](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [WebAuthn Guide](https://webauthn.guide/)

## 10) Testing

- [x] Unit tests for auth flows and schema validation.
- [x] (2026-01-01) 717+ tests passing across all UI components.
- [ ] Integration tests for API routes (vitest + supertest/fastify inject).
- [ ] Playwright E2E for auth + layout resize persistence.
- [ ] Snapshot/golden tests for key UI components (optional).
- [ ] Test data builders/factories for consistent fixtures.

## 11) Documentation

- [ ] Update README once core features land (status badges, links to docs).
- [ ] Add quickstart guides per app (web/desktop/mobile) under `docs/`.
- [ ] API docs (OpenAPI link or generated client usage) in `docs/api`.
- [ ] Release checklist (versioning, changelog, tagging).
- [x] 2025-12-29 Modularize ARCHITECTURE/TESTING/WORKFLOWS docs and add INDEX.md.
- [x] 2025-12-29 Clarify workflow to not auto-fix pre-existing lint/type-check/test failures.
- [x] 2025-12-29 Split PRINCIPLES, compress PATTERNS/ANTI_PATTERNS, add keyword routing, update Last Updated stamps.
- [x] 2025-12-29 Add context retention summaries, resume mode, session bridge, and migration classification guidance.
- [x] 2025-12-29 Move CLAUDE/AGENTS/GEMINI into docs/ and normalize doc references.
- [x] 2025-12-29 Rename dev overview docs to index.md within their modules and update references.
- [x] 2025-12-29 Fix remaining doc references after index renames.
- [x] 2025-12-29 Normalize agent doc paths/names and align template numbering/testing matrix.
- [x] 2025-12-29 Rename underscore/caps docs to lowercase-hyphen and move coding-standards/performance/use-cases into module folders.
- [x] 2025-12-29 Rename log docs to lowercase (log.md, milestone.md) and update references.
- [x] 2025-12-29 Clarify agent vs dev doc scope in INDEX.md.
- [x] 2025-12-29 Refresh README with doc links, startup paths, guardrails, and test caveat.
- [x] 2025-12-29 Add README Why/5-minute Docker run/architecture diagram/badges.
- [x] 2025-12-29 Add velocity tips, index template, examples index, and expand AGENTS guide.
- [x] 2026-01-04 Update packages/ui docs structure to match src (components/elements/layouts).

## 12) Delivery Checklist

- [ ] Clean install + `pnpm dev` smoke test passes across apps.
- [x] `pnpm build` succeeds across workspace.
- [x] `pnpm test`/`pnpm lint`/`pnpm type-check` green locally and in CI.
- [ ] Example environment variables populated for demo auth/email flows.
- [ ] Publish starter `full_code.txt` or similar export for sharing (kept gitignored).

## UI Package Priorities

### High Priority

1. **Missing Tests for Layouts**
   - `LeftSidebarLayout.test.tsx` - Needs tests
   - `RightSidebarLayout.test.tsx` - Needs tests

2. **Accessibility: Keyboard Support for ResizablePanel**
   - Add arrow key navigation for resize handles
   - Update tests and documentation

### Medium Priority

3. **Split Large Demo Registry File**
   - Current: `apps/web/src/features/demo/registry.tsx` is 1500+ lines
   - Proposed: Split into `registry/elements.tsx`, `registry/components.tsx`, `registry/layouts.tsx`

4. **Performance: Lazy Load Registry**
   - Only load component demos on demand by category

### Low Priority

5. **Code Consistency**
   - Standardize on arrow functions with forwardRef pattern across all components
