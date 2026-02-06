# @abe-stack/infra

Consolidated infrastructure adapters for the abe-stack monorepo. This package
bundles cache, database, email, HTTP/router utilities, job queue, security, and
storage providers behind a single entry point.

## Install

```bash
pnpm add @abe-stack/infra
```

## Usage

```ts
import { createMemoryCache, createDbClient, createEmailService } from '@abe-stack/infra';
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

- Prefer importing from the root entry: `@abe-stack/infra`.
- Subpath imports are not guaranteed to stay stable as consolidation continues.
