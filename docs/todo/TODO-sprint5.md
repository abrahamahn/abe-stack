# TODO Sprint 5

Source: `docs/todo/TODO.md`
Sprint heading: ### Sprint 5: Production Launch Readiness & Polish
Unchecked items captured: 79

> Auto-generated from TODO.md. This file contains only unchecked checklist items for this sprint.

## 5.1 End-to-End Journey Verification (CHECKLIST Definition of Done)

**Golden Path Flows (manual + automated):**
- [ ] Flow: Create user → create tenant → invite teammate → teammate accepts → enforce RBAC within workspace
- [ ] Flow: Run checkout → process webhooks idempotently → activate tenant plan → verify entitlements
- [x] Flow: View audit logs → filter by type → export → verify data integrity
- [x] Flow: Operate jobs via admin console → trigger job → monitor completion → verify dead-letter handling
- [x] Flow: Debug issue via correlated logs → trace request through middleware → handler → DB → response
- [x] Flow: Add new module using documented scaffold template → verify it integrates correctly

## 5.2 Production Environment Setup (CHECKLIST 13 | EXECUTION)

**Environment Provisioning:**
- [ ] Infra: production Terraform applied and verified (DigitalOcean or GCP)
- [ ] Infra: production database provisioned with connection pooling (PgBouncer or managed pool)
- [ ] Infra: production Redis/cache layer provisioned (if applicable)
- [ ] Infra: production storage bucket configured (S3-compatible with CDN)
- [ ] Infra: production SMTP provider configured and verified (SES, SendGrid, or Mailgun)
- [ ] Infra: SSL/TLS certificates provisioned (auto-renewal via Caddy or Certbot)
- [ ] Infra: reverse proxy (Caddy/Nginx) configured with security headers

**Secrets & Configuration:**
- [ ] Config: all production secrets provisioned (JWT secret, cookie secret, OAuth client IDs/secrets, Stripe keys, SMTP credentials, Turnstile secret)
- [ ] Config: env validation passes on production config (`config.env === 'production'`)
- [ ] Config: secret rotation documented — JWT rotation procedure, API key rotation, OAuth client secret rotation
- [ ] Config: verify `config.server.trustProxy` is correctly set for production reverse proxy chain

**Database Production Readiness:**
- [ ] DB: all migrations (0000–0023+) apply cleanly to fresh production DB
- [ ] DB: seed script runs without errors (`seed.ts` — production seeds only, no test data)
- [ ] DB: `bootstrap-admin.ts` creates initial admin user idempotently
- [ ] DB: backup schedule configured (automated daily backups with retention)
- [ ] DB: restore procedure tested — backup → restore → verify data integrity
- [ ] DB: connection pool size tuned for expected load

**Deployment Pipeline:**
- [ ] CI: `deploy.yml` workflow deploys to production on merge to `main` (or manual trigger)
- [ ] CI: zero-downtime deployment verified (rolling restart, no dropped connections)
- [ ] CI: rollback procedure tested — `rollback.yml` reverts to previous known-good deployment

## 5.3 Performance Optimization & Benchmarking (Appendix E.4)

**Database Performance:**
- [x] Audit: query analysis on critical paths (login, refresh, session list, tenant member list)
- [x] Audit: N+1 query detection — verify batch loading on list endpoints
- [ ] Benchmark: auth flow latency — login < 200ms p95, refresh < 50ms p95

**API Performance:**
- [x] Optimize: HTTP response compression (gzip/brotli via @fastify/compress)
- [ ] Benchmark: API latency — 95th percentile under 500ms for all endpoints under expected load

**Frontend Performance:**
- [x] Audit: production bundle size — main bundle < 250KB gzipped
- [x] Audit: image/asset optimization — asset size audit script created
- [x] Audit: Lighthouse CI configured — Performance > 80, Accessibility > 90, Best Practices > 90

**Load Testing:**
- [ ] Test: simulate 100 concurrent users — auth, dashboard, API calls
- [ ] Test: simulate sustained 50 req/s for 10 minutes — no memory leaks, stable latency
- [ ] Test: rate limiter verification under load — burst traffic correctly throttled

## 5.4 Monitoring & Alerting (CHECKLIST 10 | Appendix E.4 | BUSINESS 7.3)

**Production Monitoring:**
- [ ] Setup: Sentry integration — server + client error capture with correlation IDs
- [ ] Setup: uptime monitoring — external ping to `/health` endpoint every 60s, alert on 2 consecutive failures
- [ ] Setup: log aggregation — structured logs shipped to centralized service (Datadog, Loki, or CloudWatch)
- [ ] Setup: log retention policy — 30 days hot, 90 days cold storage
- [ ] Setup: request tracing — correlation ID visible in log aggregation for cross-service debugging

**Alerting Rules:**
- [ ] Alert: error rate > 5% over 5 minutes → Slack/email notification
- [ ] Alert: p95 latency > 2s for 5 minutes → Slack/email notification
- [ ] Alert: health endpoint returns non-200 → immediate alert
- [ ] Alert: job queue failed count > 10 in 1 hour → alert
- [ ] Alert: disk usage > 80% → warning; > 90% → critical
- [ ] Alert: database connection pool exhaustion → critical alert
- [ ] Alert: certificate expiry within 14 days → warning

**Dashboards:**
- [ ] Dashboard: request volume + latency (by route, by status code)
- [ ] Dashboard: error rate + top errors (grouped by type)
- [ ] Dashboard: auth metrics (login attempts, success rate, lockouts)
- [ ] Dashboard: job queue health (pending, processing, failed, dead-letter)
- [ ] Dashboard: active WebSocket connections

## 5.8 Cross-Module Integration Validation (EXECUTION.md)

**Appendix D Essential Features Verification (CHECKLIST):**
- [ ] Verify: deployment sanity — migrations + seed + bootstrap on fresh DB works first try

## 5.9 Pre-Launch Checklist (Final Go/No-Go)

**Technical Readiness:**
- [ ] All Sprint 1-4 items marked [x] complete
- [ ] `pnpm build` passes (lint + type-check + test) on release commit
- [ ] Production Docker image builds successfully
- [ ] Production deployment completes without errors
- [ ] Health endpoint returns 200 from production URL
- [ ] Swagger UI accessible at production `/api/docs`
- [ ] WebSocket connections work in production (SSL termination correct)

**Security Sign-Off:**
- [ ] Penetration test checklist (5.5) completed with zero critical findings
- [ ] `pnpm audit` clean (zero critical/high)
- [ ] OWASP Top 10 verified (SQL injection, XSS, CSRF, auth bypass, IDOR)
- [ ] Rate limiting verified under simulated attack
- [ ] No secrets in codebase (`git log` scan for env vars, API keys, passwords)

**Operational Readiness:**
- [ ] Monitoring active — Sentry, uptime, logs
- [ ] Alerting configured — error rate, latency, health, disk
- [ ] Backup tested — restore from backup verified within last 7 days
- [ ] Rollback tested — revert to previous deployment verified
- [ ] On-call rotation defined — who gets paged, escalation path

**Business Readiness:**
- [ ] Billing provider (Stripe) connected with production keys
- [ ] Email provider (SMTP/SES) sending real emails in production
- [ ] OAuth providers (Google, GitHub, Apple) configured with production redirect URIs
- [ ] Turnstile/CAPTCHA configured with production site key
- [ ] Terms of Service published in `legal_documents` table
- [ ] Privacy Policy published
- [ ] Support contact / feedback channel documented for users
