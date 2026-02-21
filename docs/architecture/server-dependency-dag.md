# Server Dependency DAG

Last generated: 2026-02-13

## Package DAG (workspace dependencies)

```mermaid
graph TD
  server["apps/server"]
  core["server/core"]
  server_engine["server/system"]
  realtime["server/realtime"]
  websocket["server/websocket"]
  media["server/media"]
  db["server/db"]
  shared["shared"]
  server --> core
  server --> db
  server --> realtime
  server --> server_engine
  server --> shared
  server --> websocket
  core --> media
  core --> server_engine
  core --> db
  core --> shared
  server_engine --> db
  server_engine --> shared
  realtime --> db
  realtime --> websocket
  realtime --> shared
  websocket --> server_engine
  websocket --> db
  websocket --> shared
  media --> shared
  db --> shared
```

| Layer              | Package               | Workspace deps                                                                   |
| ------------------ | --------------------- | -------------------------------------------------------------------------------- |
| `apps/server`      | `@bslt/server`        | server/core, server/db, server/realtime, server/system, shared, server/websocket |
| `server/core`      | `@bslt/core`          | server/media, server/system, server/db, shared                                   |
| `server/system`    | `@bslt/server-system` | server/db, shared                                                                |
| `server/realtime`  | `@bslt/realtime`      | server/db, server/websocket, shared                                              |
| `server/websocket` | `@bslt/websocket`     | server/system, server/db, shared                                                 |
| `server/media`     | `@bslt/media`         | shared                                                                           |
| `server/db`        | `@bslt/db`            | shared                                                                           |
| `shared`           | `@bslt/shared`        | —                                                                                |

## Import Edge Hotspots (source-level)

> Counts are import occurrences across `main/apps/server/src` + `main/server/*/src`.
> Self-imports and `-> shared` edges are excluded from this hotspot list.

| From               | To                 | Import count |
| ------------------ | ------------------ | -----------: |
| `server/core`      | `server/db`        |          182 |
| `apps/server`      | `server/system`    |           65 |
| `server/core`      | `server/system`    |           54 |
| `apps/server`      | `server/core`      |           49 |
| `server/system`    | `server/db`        |           14 |
| `apps/server`      | `server/db`        |            8 |
| `server/realtime`  | `server/db`        |            4 |
| `apps/server`      | `server/realtime`  |            2 |
| `apps/server`      | `server/websocket` |            2 |
| `server/websocket` | `server/db`        |            2 |
| `server/core`      | `server/media`     |            1 |
| `server/realtime`  | `server/websocket` |            1 |
| `server/websocket` | `server/system`    |            1 |

## Refactor Guidance

- Keep `server/core` as reusable domain/business logic package.
- Keep `apps/server` as composition/integration shell (bootstrap, wiring, plugins, runtime registration).
- Move code from `server/core` to `apps/server` only when it is app-runtime-specific.
- App-runtime-specific examples: Fastify plugin lifecycle, process/env bootstrap, app-only adapters.
- Do not collapse `server/core` into `apps/server`; this would couple domain logic to app runtime and reduce testability/reuse.
