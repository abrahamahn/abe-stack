# Release Checklist

This checklist must be completed before triggering a production deployment.

## Pre-Deployment Verification

### ✅ Code Quality
- [ ] All CI checks pass (GitHub Actions)
- [ ] Code is reviewed and approved by at least one team member
- [ ] No critical security vulnerabilities (audit tools pass)
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code coverage meets minimum requirements (>80%)
- [ ] No TypeScript errors or warnings
- [ ] Linting passes with no errors
- [ ] Formatting is consistent (Prettier)

### ✅ Configuration
- [ ] Environment variables are validated
- [ ] Configuration files are up to date
- [ ] Secrets are properly configured (see [secrets-checklist.md](./secrets-checklist.md))
- [ ] Database migrations are tested
- [ ] API contracts are backward compatible

### ✅ Documentation
- [ ] README and deployment docs are updated
- [ ] API documentation reflects changes
- [ ] Breaking changes are documented
- [ ] Migration guide exists (if needed)

## Deployment Preparation

### 🏗️ Build Verification
- [ ] Docker images build successfully
- [ ] Multi-stage build optimizations work
- [ ] Image size is reasonable (< 500MB for API, < 100MB for web)
- [ ] Security scanning passes (optional but recommended)

### 🧪 Testing
- [ ] Smoke test on staging environment (if available)
- [ ] Integration tests pass against staging
- [ ] Performance benchmarks meet requirements
- [ ] Load testing completed (if applicable)

### 📋 Deployment Checklist
- [ ] Deployment window scheduled (if needed)
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Support team notified of deployment

## Deployment Execution

### 🚀 Deployment Steps
1. [ ] Trigger deployment workflow in GitHub Actions
2. [ ] Monitor deployment logs in real-time
3. [ ] Verify services start successfully
4. [ ] Check health endpoints respond correctly
5. [ ] Test critical user flows manually

### 🔍 Post-Deployment Verification
- [ ] Application loads in browser
- [ ] Authentication flows work
- [ ] Database connections are healthy
- [ ] WebSocket connections work (if applicable)
- [ ] File uploads work (if applicable)
- [ ] Email sending works (if applicable)
- [ ] External API integrations work

## Rollback Plan

### ⚠️ Rollback Triggers
- [ ] Application fails to start
- [ ] Health checks fail consistently
- [ ] Error rate exceeds 5%
- [ ] Performance degrades significantly
- [ ] Critical functionality broken

### 🔄 Rollback Steps
1. [ ] Stop deployment if still in progress
2. [ ] Revert to previous Docker image tag
3. [ ] Restart services with previous version
4. [ ] Verify application returns to healthy state
5. [ ] Investigate root cause before retrying

## Monitoring & Alerts

### 📊 Post-Release Monitoring
- [ ] Error rates are normal (< 1%)
- [ ] Response times meet SLAs (< 100ms P95)
- [ ] Database performance is acceptable
- [ ] Resource usage is within limits
- [ ] User-reported issues are tracked

### 📞 Alert Configuration
- [ ] Error rate alerts (> 5%)
- [ ] Response time alerts (> 200ms P95)
- [ ] Database connection alerts
- [ ] Disk space alerts (< 10% free)
- [ ] Memory usage alerts (> 90%)

## Communication

### 📢 Deployment Notification
- [ ] Team notified of successful deployment
- [ ] Users notified of new features (if applicable)
- [ ] Support team updated with known issues
- [ ] Incident response plan reviewed

### 📝 Post-Mortem (if issues occurred)
- [ ] Root cause analysis completed
- [ ] Lessons learned documented
- [ ] Process improvements identified
- [ ] Follow-up actions assigned

## Quality Gates

### Blocking Criteria
- [ ] Zero critical security vulnerabilities
- [ ] All automated tests pass
- [ ] Manual testing of critical paths complete
- [ ] Performance requirements met
- [ ] No known breaking changes for users

### Approval Requirements
- [ ] Code review approval from appropriate team members
- [ ] QA sign-off for user-facing changes
- [ ] Security review for authentication/authorization changes
- [ ] Architecture review for infrastructure changes

## Deployment Environments

### 🧪 Staging Deployment
- [ ] Deployed to staging first
- [ ] End-to-end testing completed
- [ ] Stakeholder approval obtained
- [ ] Data migration tested (if applicable)

### 🏭 Production Deployment
- [ ] All staging validations pass
- [ ] Business approval obtained
- [ ] Deployment window approved
- [ ] Backup completed before deployment

## Success Metrics

### 🎯 Deployment Success Criteria
- [ ] Zero downtime during deployment
- [ ] All services healthy within 5 minutes
- [ ] No user-impacting errors in first hour
- [ ] Performance meets or exceeds baseline
- [ ] Monitoring dashboards show normal operation

### 📈 Post-Deployment Metrics
- [ ] Track error rates for 24 hours
- [ ] Monitor user engagement metrics
- [ ] Measure performance improvements
- [ ] Collect user feedback on new features