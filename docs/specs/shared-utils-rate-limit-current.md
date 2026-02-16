# Shared Utils: Rate Limit Module - Current Behavior Spec

**Status:** DRAFT (Current State)
**Module:** `@bslt/shared/utils/rate-limit`
**Source:** `main/shared/src/utils/rate-limit.ts`

## Overview

The Rate Limit module provides a lightweight, detailed "Sliding Window" rate limiter algorithm. It is designed to be O(1) in performance to protect hot paths (like API middleware) from abuse without adding significant latency.

## Core Capabilities

### 1. Sliding Window Algorithm

- **Method:** Interpolated Sliding Window (Fixed Window variants + Weighted Average).
- **State:** Tracks `prevCount`, `currCount`, and `windowStart` for each identifier.
- **Window Rotation:**
  - If `elapsed >= windowMs * 2`: Full reset (Both previous and current counts = 0).
  - If `elapsed >= windowMs`: Rotate (Previous becomes Current, Current becomes 0).
- **Estimation:** Calculates usage as: `(prevCount * weight) + currCount`, where `weight` decreases as time progresses into the current window.

### 2. Cleanup & Memory Management

- **Strategy:** Periodic cleanup loop inside the request check.
- **Interval:** Runs every 60,000ms (1 minute).
- **Logic:** Removes any identifier whose window has fully expired (`windowStart + windowMs <= cutoff`).

## API Surface

### `createRateLimiter`

| Input         | Type     | Description                                         |
| :------------ | :------- | :-------------------------------------------------- |
| `windowMs`    | `number` | The duration of the sliding window in milliseconds. |
| `maxRequests` | `number` | The maximum allowed requests within `windowMs`.     |

| Output Function     | Input                | Returns                                   |
| :------------------ | :------------------- | :---------------------------------------- |
| `check(identifier)` | `identifier: string` | `{ allowed: boolean; resetTime: number }` |

## Behavior Notes & Edge Cases

1.  **Strict Blocking:** Returns `allowed: false` immediately if `estimatedCount >= maxRequests`.
2.  **Stateful Closure:** The returned function closes over a `Map<string, WindowState>`. This state is **in-memory only**.
    - _Limitation:_ It does NOT share state across multiple server instances (e.g., clustered Node.js or serverless lambdas).
3.  **Cleanup Trigger:** Cleanup is lazy; it only runs when a request comes in. If no requests come in, memory is held indefinitely (though minimal).

## Observed Limitations / Flaws (For Audit)

- **The "Double Count" Bug:** The code snippet `state.currCount++` happens _after_ the check. However, in the rotation logic, `state.currCount` is reset to 0 without carrying over the current request if a rotation happened _during_ the request.
- **Interpolation Accuracy:** The formula `state.prevCount * prevWeight + state.currCount` is an approximation. It assumes traffic in the previous window was evenly distributed. Burst traffic at the _end_ of the previous window might be under-weighted.
- **Distributed Systems:** As noted, this is useless for distributed rate limiting (e.g., checking abuse across 5 load-balanced servers) without an external store like Redis.

## Usage Example

```typescript
const limiter = createRateLimiter(60000, 10); // 10 requests per minute

// In middleware:
const { allowed, resetTime } = limiter(req.ip);
if (!allowed) {
  throw new TooManyRequestsError(resetTime);
}
```
