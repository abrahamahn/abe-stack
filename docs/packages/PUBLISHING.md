# Publishing Guide

This guide covers the process for publishing @aahn packages to npm.

## Table of Contents

- [Pre-Publish Checklist](#pre-publish-checklist)
- [Publishing Process](#publishing-process)
- [Post-Publish Tasks](#post-publish-tasks)
- [Emergency Procedures](#emergency-procedures)
- [Troubleshooting](#troubleshooting)

---

## Pre-Publish Checklist

Before publishing any package, complete all items in this checklist:

### 1. Version and Changelog Updates

- [ ] Update version number in all package.json files (synchronized versioning)

  ```bash
  # packages/ui/package.json
  # packages/shared/package.json
  # packages/api-client/package.json
  # packages/storage/package.json
  # packages/db/package.json
  ```

- [ ] Update CHANGELOG.md in all affected packages
  - Add new version section with date
  - Document all changes under appropriate categories (Added, Changed, Fixed, etc.)
  - Include migration guide for breaking changes

- [ ] Update VERSIONING.md if versioning policy changes

### 2. Code Quality

- [ ] All tests pass

  ```bash
  pnpm test
  ```

- [ ] Type checking passes

  ```bash
  pnpm type-check
  ```

- [ ] Linting passes

  ```bash
  pnpm lint
  ```

- [ ] No uncommitted changes
  ```bash
  git status
  ```

### 3. Build Verification

- [ ] Clean build succeeds

  ```bash
  pnpm clean
  pnpm build
  ```

- [ ] Verify dist/ directories exist in all packages

  ```bash
  ls -la packages/ui/dist
  ls -la packages/shared/dist
  ls -la packages/api-client/dist
  ls -la packages/storage/dist
  ls -la packages/db/dist
  ```

- [ ] Verify export paths resolve correctly
  ```bash
  pnpm validate:exports  # if validation tool is set up
  ```

### 4. Documentation

- [ ] README files are up to date
- [ ] EXPORTS.md reflects current export structure
- [ ] Migration guides created for breaking changes
- [ ] API documentation updated (if applicable)

### 5. Dependencies

- [ ] All dependency versions are correct
- [ ] No unnecessary dependencies
- [ ] Peer dependencies documented in README

### 6. npm Configuration

- [ ] Logged into npm

  ```bash
  npm whoami
  ```

- [ ] Have publish permissions for @aahn organization
- [ ] 2FA enabled for npm account (required for publishing)

---

## Publishing Process

### Option 1: Publish All Packages (Recommended)

Use this for synchronized versioning:

```bash
# 1. Dry run to preview what will be published
pnpm -r publish --dry-run

# 2. Review the output carefully
#    - Check version numbers
#    - Verify file list
#    - Confirm package contents

# 3. Publish all packages
pnpm -r publish --access public

# 4. Enter OTP (One-Time Password) from authenticator app when prompted
```

### Option 2: Publish Individual Packages

Use this if only specific packages changed (not recommended for synchronized versioning):

```bash
# Navigate to package directory
cd packages/ui

# Dry run
pnpm publish --dry-run

# Publish
pnpm publish --access public
```

### Package Publish Order (If Publishing Individually)

If you must publish individually, follow this order to respect dependencies:

1. `@aahn/storage` (no internal dependencies)
2. `@aahn/shared` (depends on storage)
3. `@aahn/db` (no internal dependencies)
4. `@aahn/api-client` (depends on shared)
5. `@aahn/ui` (depends on shared)

### What Gets Published?

Each package publishes:

- `dist/` directory (compiled JavaScript + TypeScript declarations)
- `package.json`
- `CHANGELOG.md`
- `README.md`
- `LICENSE` (if exists)

Files excluded (via .npmignore or files field):

- `src/` directory
- `node_modules/`
- Test files
- Development configs
- `.env` files

---

## Post-Publish Tasks

### 1. Git Tagging

Tag the release in git:

```bash
# Tag the release (use version number)
git tag v1.1.0

# Push tags to remote
git push --tags
```

### 2. GitHub Release

Create a GitHub release:

1. Go to https://github.com/abrahamahn/abe-stack/releases
2. Click "Draft a new release"
3. Select the tag you just pushed (v1.1.0)
4. Release title: "v1.1.0"
5. Description: Copy from CHANGELOG.md
6. Publish release

Example release notes:

```markdown
# v1.1.0 - Better Tree-Shaking with Granular Exports

## 🎉 Highlights

- Added category-based secondary exports to all packages
- Potential 20-60% bundle size reduction for optimized imports
- 100% backward compatible - no breaking changes

## 📦 Packages Updated

All packages bumped to v1.1.0:

- @aahn/ui
- @aahn/shared
- @aahn/api-client
- @aahn/storage
- @aahn/db

## 📖 Documentation

- [Migration Guide](./docs/MIGRATION-1.1.0.md)
- [Export Usage Guide](./docs/EXPORTS.md)
- [Versioning Policy](./VERSIONING.md)

## 🔗 Links

- [Full Changelog](./packages/ui/CHANGELOG.md)
- [npm Package](https://www.npmjs.com/package/@aahn/ui)
```

### 3. Verification

Verify packages are published correctly:

```bash
# Check package on npm
npm view @aahn/ui version
npm view @aahn/shared version
npm view @aahn/api-client version
npm view @aahn/storage version
npm view @aahn/db version

# Test installation in a fresh project
mkdir /tmp/test-install
cd /tmp/test-install
npm init -y
npm install @aahn/ui@latest
npm install @aahn/shared@latest
# Verify imports work
```

### 4. Update Documentation Site

If you have a documentation website:

- [ ] Update version in docs
- [ ] Rebuild and deploy docs
- [ ] Verify documentation is accessible

### 5. Communication

Announce the release:

- [ ] Update internal team channels (Slack, Discord, etc.)
- [ ] Post on Twitter/social media (if public project)
- [ ] Send email to package consumers (if applicable)
- [ ] Update project website/blog

Example announcement:

```
🎉 @aahn v1.1.0 is now available!

✨ New: Granular imports for better tree-shaking
📦 Potential 20-60% bundle size reduction
🔄 100% backward compatible

Learn more: https://github.com/abrahamahn/abe-stack

npm install @aahn/ui@latest
```

---

## Emergency Procedures

### Unpublishing a Package

**Warning:** Unpublish only works within 72 hours and should be used only for critical issues.

```bash
# Unpublish specific version
npm unpublish @aahn/ui@1.1.0

# Unpublish all versions (DANGEROUS - requires justification)
npm unpublish @aahn/ui --force
```

**When to unpublish:**

- Accidentally published with critical security vulnerability
- Published with incorrect/corrupted files
- Published with broken functionality that can't wait for patch

**When NOT to unpublish:**

- Minor bugs (publish a patch instead)
- Missing documentation (publish a patch)
- Non-critical issues (publish a patch)

### Publishing a Hotfix

For critical bugs in production:

1. Create hotfix branch from tag

   ```bash
   git checkout -b hotfix/1.1.1 v1.1.0
   ```

2. Apply minimal fix

3. Update version and CHANGELOG

   ```json
   {
     "version": "1.1.1"
   }
   ```

4. Test thoroughly

   ```bash
   pnpm test
   pnpm build
   ```

5. Publish hotfix

   ```bash
   pnpm -r publish --access public
   ```

6. Tag and merge
   ```bash
   git tag v1.1.1
   git push --tags
   git checkout main
   git merge hotfix/1.1.1
   ```

### Deprecating a Package/Version

To mark a version as deprecated:

```bash
npm deprecate @aahn/ui@1.1.0 "Security vulnerability, please upgrade to 1.1.1"
```

---

## Troubleshooting

### Issue: "You do not have permission to publish"

**Solution:**

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami

# Verify org membership
npm org ls @aahn
```

### Issue: "Version already exists"

**Solution:**

```bash
# Check current version on npm
npm view @aahn/ui version

# Update to next version
# Edit package.json: "version": "1.1.1"
```

### Issue: "Package size exceeds limit"

**Solution:**

```bash
# Check package size
npm pack --dry-run

# Review what's being included
npm pack
tar -tzf abe-stack-ui-1.1.0.tgz

# Add exclusions to .npmignore or package.json files field
```

### Issue: "2FA token required but not provided"

**Solution:**

- Ensure 2FA is set up on your npm account
- Have authenticator app ready
- Use `--otp=<code>` flag:
  ```bash
  pnpm publish --otp=123456
  ```

### Issue: "Exports not resolving after publish"

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Reinstall package
rm -rf node_modules/@aahn
npm install @aahn/ui@latest

# Verify package.json exports field is correct
npm view @aahn/ui exports
```

---

## Publishing Checklist Summary

Quick checklist for publishing:

```
Pre-Publish:
☐ Update versions (all packages → 1.1.0)
☐ Update CHANGELOG.md (all packages)
☐ Run tests (pnpm test)
☐ Type check (pnpm type-check)
☐ Clean build (pnpm clean && pnpm build)
☐ Verify exports (check dist/ directories)
☐ Git status clean

Publish:
☐ Dry run (pnpm -r publish --dry-run)
☐ Review dry run output
☐ Publish (pnpm -r publish --access public)
☐ Verify on npm (npm view @aahn/ui version)

Post-Publish:
☐ Git tag (git tag v1.1.0 && git push --tags)
☐ GitHub release
☐ Test installation
☐ Announce release
☐ Update docs site
```

---

## Automation (Future)

Consider setting up automated publishing:

### GitHub Actions (Future Enhancement)

```yaml
# .github/workflows/publish.yml
name: Publish Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
      - run: pnpm -r publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Changesets (Alternative)

Consider using [changesets](https://github.com/changesets/changesets) for versioning:

```bash
pnpm add -D @changesets/cli
pnpm changeset init
```

---

## Additional Resources

- [npm Publishing Guide](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Versioning Policy](../VERSIONING.md)
- [Package Exports Guide](./EXPORTS.md)

---

## Questions?

- GitHub Issues: https://github.com/abrahamahn/abe-stack/issues
- npm Support: https://www.npmjs.com/support
