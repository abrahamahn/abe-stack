# Horizontal Scaling Guide

How to run multiple ABE Stack server instances behind a load balancer.

---

## Architecture Overview

ABE Stack is designed for stateless horizontal scaling:

- **No server-side sessions** — JWT-based auth, no sticky sessions needed
- **Shared database** — PostgreSQL is the single source of truth
- **Cross-instance messaging** — PostgresPubSub (NOTIFY/LISTEN) keeps WebSocket clients in sync
- **Pluggable cache** — Switch from in-memory to Redis when scaling beyond one instance

---

## Cache Provider Selection

### Environment Variable

```env
CACHE_PROVIDER=local    # Default: in-memory LRU cache (single instance)
CACHE_PROVIDER=redis    # Redis-backed cache (multi-instance)
```

### When to use each

| Provider | Use Case                     | Pros                       | Cons                              |
| -------- | ---------------------------- | -------------------------- | --------------------------------- |
| `local`  | Single instance, development | Zero dependencies, fastest | Cache not shared across instances |
| `redis`  | Multi-instance, production   | Shared cache, persistence  | Requires Redis server             |

### Redis Configuration

```env
CACHE_PROVIDER=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=            # Optional
REDIS_DB=0                 # Optional, default 0
CACHE_TTL_MS=300000        # Default TTL: 5 minutes
CACHE_MAX_SIZE=1000        # Max entries (memory provider only)
```

### Legacy Compatibility

`CACHE_USE_REDIS=true` is still supported but `CACHE_PROVIDER=redis` is preferred.

---

## Database Read Replica

For read-heavy workloads, configure a read replica:

```env
DATABASE_READ_REPLICA_URL=postgresql://user:pass@replica-host:5432/mydb
```

When set, read operations (search, listings) use the replica while writes always go to the primary. When unset, all operations use the primary connection.

### How it works

The `ReadReplicaClient` wrapper exposes:

- `write` / `primary` — always the primary database
- `read` / `replica` — the replica (or primary if no replica configured)

---

## WebSocket Cross-Instance Routing

### Problem

WebSocket connections are sticky to the server instance they connected to. When Instance A writes data, clients connected to Instance B won't receive updates.

### Solution: PostgresPubSub

1. Instance A writes to the database
2. Instance A calls `pubsub.publish(key, version)` which:
   - Notifies local WebSocket subscribers (Instance A's clients)
   - Sends `NOTIFY app_events` to PostgreSQL
3. All other instances receive the `LISTEN` notification
4. Each instance calls `publishLocal(key, version)` to notify its own WebSocket clients

This happens automatically — no additional configuration needed beyond a working PostgreSQL connection.

### Instance ID

Each server generates a unique `instanceId` on startup. Messages include this ID to prevent echo (receiving your own notifications). This is handled internally by `PostgresPubSub`.

---

## Stateless Server Design

The server stores no request-scoped state between requests:

| Concern                 | Storage                  | Stateless?                                       |
| ----------------------- | ------------------------ | ------------------------------------------------ |
| Authentication          | JWT tokens (client-side) | Yes                                              |
| Session tracking        | `user_sessions` DB table | Yes                                              |
| WebSocket subscriptions | In-memory per instance   | Yes (rebuilt on reconnect)                       |
| Cache                   | Memory or Redis          | Yes (cache is optimization, not source of truth) |
| Background jobs         | PostgreSQL `jobs` table  | Yes                                              |
| File uploads            | S3 or local filesystem   | Yes                                              |

### What this means for deployment

- Any instance can handle any request
- No sticky sessions required at the load balancer
- Instances can be added/removed without coordination
- Rolling deployments work without draining

---

## Deployment Recommendations

### Minimum viable scaling

1. Set `CACHE_PROVIDER=redis` and point all instances at the same Redis
2. Point all instances at the same PostgreSQL primary
3. Use a load balancer with round-robin or least-connections
4. WebSocket connections need the load balancer to support upgrades (most do by default)

### Production checklist

- [ ] Redis server running and accessible from all instances
- [ ] PostgreSQL connection pool sized for total instance count (`DB_MAX_CONNECTIONS` / instances)
- [ ] Load balancer configured for WebSocket upgrade support
- [ ] Health check endpoint (`/health/ready`) configured in load balancer
- [ ] Shared filesystem or S3 for file storage (`STORAGE_PROVIDER=s3`)

---

## Deferred Items

These are not needed for initial horizontal scaling:

- **Redis-backed queue**: `MemoryQueueStore` is sufficient for low-volume background jobs. Each instance processes its own queue.
- **Redis pub/sub for WebSocket**: PostgresPubSub already handles cross-instance messaging. Redis pub/sub would only be needed if Postgres becomes a bottleneck.
- **CDN/asset optimization**: Vite already does content hashing. CDN is a deployment concern, not a code change.
- **Load testing**: Requires dedicated infrastructure and tooling.
