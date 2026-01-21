# ABE Stack - TODO

> **Scope:** Solo developer to small team (3-5 engineers), 50,000+ users, up to Series A.
> **Philosophy:** Ship products. The foundation is solid. Build features users pay for.

---

## High Priority: Authentication

### Social/OAuth Providers (Backend)

- [ ] Google OAuth (direct integration)
- [ ] GitHub OAuth (direct integration)
- [ ] Apple OAuth (direct integration)
- [ ] OAuth connection management UI
- [ ] Account linking (multiple providers per account)

---

## Medium Priority: UI Package

### Demo Performance (Frontend)

- [ ] Individual component lazy loading (currently category-based only)
- [ ] Progressive loading within categories
- [ ] Route-based code splitting for demo pages

### Code Quality (Frontend)

- [ ] Standardize arrow functions with forwardRef
- [ ] Consistent prop naming across components
- [ ] JSDoc comments on public APIs

\*\*CUTOFF LINE -----------------------------------

## Medium Priority: Infrastructure

### Frontend

- [ ] Error boundary + toasts for API errors
- [ ] Focus management improvements

### Backend

- [ ] Production Postgres settings (connection pooling, SSL)
- [ ] Secrets management documentation
- [ ] Database backup/retention plan

### Testing

- [ ] Integration tests for API routes (vitest + fastify inject)
- [ ] Playwright E2E for auth flows
- [ ] Security audit: OWASP testing guide

### Documentation

- [ ] Security decision documentation (why Argon2id params, grace periods, etc.)
- [ ] Quickstart guides per app
- [ ] Release checklist

---

## Low Priority: Observability

- [ ] Prometheus metrics (login attempts, sessions, hash duration, lockouts)
- [ ] Query performance monitoring
- [ ] Batch user lookups optimization

---

## Unused Code to Integrate

Code that exists but isn't used anywhere. Integrate when implementing related tasks.

| Unused Code                            | Package         | Related Task           |
| -------------------------------------- | --------------- | ---------------------- |
| `MutationQueue`, `createMutationQueue` | sdk/persistence | Offline mutations      |
| `localStorageQueue`                    | sdk/persistence | IndexedDB fallback     |
| `useOnScreen`                          | ui/hooks        | Lazy loading           |
| `useCopyToClipboard`                   | ui/hooks        | Demo copy button       |
| `usePanelConfig`                       | ui/hooks        | ResizablePanel layouts |

---

## Success Metrics

### Seed Stage

- [ ] First paying customers
- [ ] <100ms P95 latency on critical paths
- [ ] Zero security incidents

### Series A

- [ ] Multi-product architecture working
- [ ] Team of 3-5 engineers productive
- [ ] 99.9% uptime
- [ ] Cache layer reducing DB load by 30%+

---

## The Rule

**Before adding to this TODO, ask:**

1. Does a user need this to give me money?
2. Will this unblock a product feature?
3. Is this a security/legal requirement?

If no to all three, it goes in `docs/ROADMAP.md`.

---

## References

### WebSocket Enhancements (Backend + Frontend)

- [ ] Auth token refresh on reconnect (use `onConnect` callback)
- [ ] React Query cache invalidation on WebSocket events
- [ ] Presence tracking (online/offline/away, last seen)
- [ ] Typing indicators via WebSocket events

- **Deferred features:** See `docs/ROADMAP.md`
- **Legacy migrations:** See `docs/dev/legacy.md`
- **Security overview:** See `docs/dev/security.md`
- **SDK features:** See `packages/sdk/README.md`
- **Core utilities:** See `packages/core/README.md`

---

_Last Updated: 2026-01-22_
