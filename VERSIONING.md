# Versioning Strategy

## Semantic Versioning

All publishable packages in the @abe-stack monorepo follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH).

### Version Format

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes that require consumer code updates
- **MINOR**: New features added in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

## Current Versions

All packages are synchronized at version **1.1.0**:

- `@abe-stack/ui`
- `@abe-stack/shared`
- `@abe-stack/api-client`
- `@abe-stack/storage`
- `@abe-stack/db`

## Versioning Strategy: Synchronized

This monorepo uses **synchronized versioning** where all packages share the same version number. This approach:

- Simplifies dependency management within the monorepo
- Makes it clear which packages are compatible
- Reduces confusion for consumers
- Streamlines the release process

When any package changes, all packages bump to the next version together.

## Breaking Changes Policy

### What Constitutes a Breaking Change

Breaking changes require a MAJOR version bump and include:

- Removing or renaming exported functions, classes, or types
- Changing function signatures in a non-backward-compatible way
- Removing secondary export paths (e.g., removing `@abe-stack/ui/components`)
- Changing behavior that consumers rely on
- Updating peer dependency requirements (major versions)

### What is NOT a Breaking Change

The following are considered MINOR or PATCH changes:

- Adding new exports or features
- Adding new secondary export paths
- Fixing bugs that restore intended behavior
- Internal refactoring that doesn't affect public API
- Deprecating (but not removing) features
- Adding optional parameters with defaults

### Documentation Requirements

All breaking changes must:

1. Be documented in the package's `CHANGELOG.md`
2. Include a migration guide with before/after examples
3. Be highlighted in the release notes
4. Provide a clear deprecation path when possible

## Export Stability Guarantees

### Main Exports

Main package exports (e.g., `@abe-stack/ui`) are **stable** and follow semver strictly.

```typescript
// Stable - follows semver
import { Button } from '@abe-stack/ui';
```

### Secondary Exports

Secondary exports (e.g., `@abe-stack/ui/components`) became stable as of **v1.1.0** and follow semver.

```typescript
// Stable as of v1.1.0 - follows semver
import { Button } from '@abe-stack/ui/components';
```

### Internal Paths

Internal paths (deep imports beyond documented exports) are **not supported** and may break at any time without warning.

```typescript
// NOT SUPPORTED - may break without warning
import { Button } from '@abe-stack/ui/dist/components/Button';
```

## Release Process

### 1. Pre-Release Checklist

Before releasing a new version:

- [ ] Update `CHANGELOG.md` in all affected packages
- [ ] Bump version numbers in all package.json files
- [ ] Run full test suite: `pnpm test`
- [ ] Run type checking: `pnpm type-check`
- [ ] Build all packages: `pnpm build`
- [ ] Validate exports: `pnpm validate:exports`
- [ ] Review bundle sizes for significant changes
- [ ] Update migration guides for breaking changes

### 2. Publishing

```bash
# Dry run to preview what will be published
pnpm -r publish --dry-run

# Publish all packages
pnpm -r publish --access public

# Or publish individually
cd packages/ui
pnpm publish --access public
```

### 3. Post-Release

After publishing:

- [ ] Tag the release in git: `git tag v1.1.0`
- [ ] Push tags: `git push --tags`
- [ ] Create GitHub release with changelog
- [ ] Update documentation site (if applicable)
- [ ] Announce release in relevant channels

## Deprecation Policy

When deprecating features:

1. **Mark as deprecated** in the current MINOR version
   - Add `@deprecated` JSDoc comments
   - Log console warnings in development
   - Document the deprecation in CHANGELOG.md

2. **Provide migration path** with clear alternatives

3. **Remove in next MAJOR version** (minimum 3 months after deprecation)

Example deprecation notice:

```typescript
/**
 * @deprecated Use `NewComponent` instead. Will be removed in v2.0.0
 * @see {@link NewComponent}
 */
export const OldComponent = () => {
  /* ... */
};
```

## Dependency Updates

### Internal Dependencies

When updating internal package dependencies (e.g., @abe-stack/ui depending on @abe-stack/shared):

- Must use workspace protocol: `workspace:*`
- Version bumps are synchronized

### Peer Dependencies

Updating peer dependency major versions is a **BREAKING CHANGE**.

Example:

- Requiring React 19 when previously supporting React 18: MAJOR bump
- Supporting both React 18 and 19: MINOR bump (expanded compatibility)

### Regular Dependencies

- MAJOR version updates: Evaluate if breaking, document in CHANGELOG
- MINOR/PATCH updates: Can be done in MINOR/PATCH releases

## Version History

| Version | Date       | Type  | Description                                   |
| ------- | ---------- | ----- | --------------------------------------------- |
| 1.1.0   | 2025-12-30 | MINOR | Added secondary export paths for tree-shaking |
| 1.0.0   | 2025-XX-XX | MAJOR | Initial release                               |

## Emergency Patches

For critical security or bug fixes:

1. Create a patch branch from the last release tag
2. Apply the minimal fix
3. Bump PATCH version
4. Publish immediately
5. Backport to main branch if needed

## Questions?

For questions about versioning or to report issues:

- GitHub Issues: https://github.com/abrahamahn/abe-stack/issues
- Repository: https://github.com/abrahamahn/abe-stack
