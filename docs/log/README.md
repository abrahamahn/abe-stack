# Development Log

**Last Updated: January 20, 2026**

Weekly changelog files for the ABE Stack project.

---

## 2026

| Week                 | Dates     | Highlights                                                            |
| -------------------- | --------- | --------------------------------------------------------------------- |
| [W04](./2026-W04.md) | Jan 20-26 | SDK improvements, security audit, auth navigation hooks               |
| [W03](./2026-W03.md) | Jan 13-19 | Pagination system, domain architecture, RecordCache, TransactionQueue |
| [W02](./2026-W02.md) | Jan 6-12  | Build tooling, codebase simplification                                |
| [W01](./2026-W01.md) | Jan 1-5   | File reorganization, initial setup                                    |

---

## Recent Changes (This Week)

### 2026-01-20

- **SDK**: Migrated auth navigation hook, query key factory, error handling improvements
- **Security**: Rate limit presets for auth endpoints, correlation IDs, CSRF documentation
- **Architecture**: Domain-based reorganization of `packages/core`
- **Cache**: RecordStorage, RecordCache, LoaderCache, UndoRedoStack
- **Offline**: TransactionQueue for offline-first mutations
- **Real-time**: WebsocketPubsubClient, SubscriptionCache

See [Week 4 log](./2026-W04.md) for full details.

---

[Back to main docs](../README.md)
