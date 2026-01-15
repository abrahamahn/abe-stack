# Real-time Architecture

_Last Updated: January 15, 2026_

This section covers the real-time collaboration features planned for ABE Stack, based on CHET-Stack patterns.

---

## Documents

| Document                                          | Purpose                                |
| ------------------------------------------------- | -------------------------------------- |
| [Overview](./overview.md)                         | Quick start and feature summary        |
| [Architecture](./architecture.md)                 | Detailed sync architecture design      |
| [Implementation Guide](./implementation-guide.md) | Step-by-step implementation plan       |
| [Patterns](./patterns.md)                         | Common real-time patterns and examples |

---

## Quick Summary

The real-time system provides:

- **WebSocket pub/sub** - Live updates via subscription channels
- **Optimistic updates** - Instant UI feedback with server reconciliation
- **Conflict resolution** - Last-write-wins with optional CRDT support
- **Offline support** - Queue operations for later sync

---

## Status

These features are planned for implementation after the V5 architecture migration. See [ROADMAP.md](../../../ROADMAP.md) for timeline.

## See Also

- [Architecture Overview](../index.md)
- [CHET-Stack Comparison](../chet-comparison.md)
- [V5 Proposal](../v5-proposal.md)

---

_Last Updated: January 15, 2026_
