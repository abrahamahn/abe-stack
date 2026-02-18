# @bslt/infra

Consolidated infrastructure adapters for the bslt monorepo. This package
bundles cache, database, email, HTTP/router utilities, job queue, security, and
storage providers behind a single entry point.

## Install

```bash
pnpm add @bslt/infra
```

## Usage

```ts
import { createMemoryCache, createDbClient, createEmailService } from '@bslt/infra';
```

## Contents

- Cache (LRU, memoization, providers)
- Database (query builder, repos, schema utilities, search)
- Email (templates + service adapters)
- HTTP (router helpers, middleware, config)
- Jobs (queue + scheduled jobs)
- Security (rate limiting + security helpers)
- Storage (file storage providers)

## Notes

- Prefer importing from the root entry: `@bslt/infra`.
- Subpath imports are not guaranteed to stay stable as consolidation continues.
