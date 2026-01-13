# ABE Stack Use Cases & Example Prompts

Detailed use cases with example prompts for common development tasks. Learn how to effectively use Claude Code for various scenarios.

**Quick Reference:** See [CLAUDE.md](../../../AGENTS.md) for essentials.

Quick Summary:

- Copy-paste prompts to speed common workflows.
- Prefer targeted, context-aware questions.
- Use structured asks for refactors and migrations.

## Modules

- None. This page is the canonical use-case prompt library.

## Key Patterns/Commands

| Name               | Description                      | Link                                         |
| ------------------ | -------------------------------- | -------------------------------------------- |
| Code understanding | Navigate unfamiliar code quickly | `#use-case-1-code-understanding--navigation` |
| Refactors          | Multi-file changes with patterns | `#use-case-2-refactoring--migrations`        |
| Performance        | Bottleneck discovery and fixes   | `#use-case-3-performance-optimization`       |

See Also:

- `dev/workflows/index.md`
- `dev/patterns/index.md`

---

## Common Use Cases with Detailed Examples

### Use Case 1: Code Understanding & Navigation

**When exploring unfamiliar code:**

Claude Code helps you get up to speed quickly in unfamiliar parts of the codebase when onboarding, debugging, or investigating an incident.

**Example prompts:**

```
"Where is the authentication logic implemented in this repo?"

"Summarize how requests flow through the payment service from entrypoint to response."

"Which modules interact with the email service and how are failures handled?"

"Map out the data flow from the checkout form submission to the order confirmation email."

"I'm new to this codebase. Show me the critical path for user registration."
```

**From Anthropic's API team:** Instead of copying code snippets and dragging files into Claude.ai while explaining problems extensively, ask questions directly in Claude Code without additional context gathering.

**Advanced navigation:**

```
"Find all files that use the deprecated getUserById() function."

"Show me every place where we manually build SQL strings instead of using Drizzle."

"Trace the control flow when a payment fails - from frontend to database."
```

**Incident response pattern:**

```
"Here's the stack trace from production [paste trace].
Trace the control flow through the codebase and identify:
1. Where the error originated
2. What upstream calls led to this state
3. What data conditions trigger this error
4. Suggested fix with minimal blast radius"
```

### Use Case 2: Refactoring & Migrations

**Pattern: Make consistent changes across multiple files**

Codex/Claude Code excels at changes that span multiple files or packages - especially when the same update needs to be made across dozens of files with awareness of structure and dependencies.

**Example prompts:**

```
"Replace all callback-based database access with async/await across the entire codebase."

"Migrate every instance of getUserById() to our new UserService.findById() pattern."

"Split this 500-line UserProfile component into smaller, focused components following our composition patterns."

"Convert all instances of var to const/let following ESLint best practices."

"Update all imports from @company/utils to @abe-stack/core."
```

**From Anthropic's Backend Engineer:**

> "Claude Code swapped every legacy getUserById() for our new service pattern and opened the PR. It did in minutes what would've taken hours."

**Advanced refactoring:**

```
"Analyze our error handling patterns and create a consistent approach:
1. Survey current error handling in /src/api/
2. Design a unified error handler pattern
3. Apply it consistently across all routes
4. Update tests to match new pattern
5. Generate migration guide for the team"
```

**Breaking up large modules:**

```
"This 800-line auth.ts file does too much. Break it into:
- auth/handlers.ts (route handlers)
- auth/middleware.ts (auth middleware)
- auth/validators.ts (input validation)
- auth/service.ts (business logic)
- auth/types.ts (TypeScript types)

Maintain all existing functionality and tests."
```

### Use Case 3: Performance Optimization

**Pattern: Identify and fix bottlenecks**

**Example prompts:**

```
"Optimize this loop for memory efficiency and explain why your version is faster."

"Find repeated expensive operations in this request handler and suggest caching opportunities."

"Analyze this SQL query for N+1 problems and suggest batch loading with Drizzle."

"This API endpoint is slow. Profile the code and identify the top 3 bottlenecks."

"Suggest a faster way to batch these database queries."
```

**From Anthropic's Performance Engineer:**

> "I use Claude Code to scan for repeated expensive DB calls. It's great at flagging hot paths and drafting batched queries I can later tune."

**Advanced performance work:**

```
"Here's our user dashboard that loads slowly [paste code].

Analysis needed:
1. Identify N+1 query patterns
2. Find unnecessary re-renders in React
3. Locate blocking operations that could be parallelized
4. Suggest caching strategies

Then implement the top 3 improvements."
```

### Use Case 4: Improving Test Coverage

**Pattern: Write comprehensive tests faster**

Claude Code helps engineers write tests faster — especially in places where coverage is thin or completely missing.

**Example prompts:**

```
"Write unit tests for this formatCurrency function, including edge cases:
- Zero values
- Negative numbers
- Very large numbers
- Different currency codes
- Invalid inputs"

"Generate integration tests for the /api/users endpoints covering:
- Success cases (GET, POST, PUT, DELETE)
- Validation errors (missing fields, invalid format)
- Authorization errors (unauthenticated, wrong permissions)
- Not found errors"

"Create property-based tests for this sorting utility using Vitest."

"This module has 30% coverage. Identify untested code paths and write tests for them."
```

**From Anthropic's Frontend Engineer:**

> "I point Claude Code at low‑coverage modules overnight and wake up to runnable unit‑test PRs."

**Advanced test generation:**

```
"We have a complex state machine for order processing. Generate tests that cover:
1. All valid state transitions
2. All invalid state transitions (should throw)
3. Edge cases (concurrent updates, timeout scenarios)
4. Integration with payment processing
5. Rollback scenarios when payment fails

Use our existing test utilities in /tests/helpers/"
```

### Use Case 5: Increasing Development Velocity

**Pattern: Accelerate both start and end of development cycle**

**Scaffolding new features:**

```
"Scaffold a new API route for POST /api/webhooks/stripe:
- Verify webhook signature
- Parse event payload
- Route to appropriate handler based on event type
- Log all events to database
- Return 200 immediately (async processing)
- Include error handling and logging
- Generate tests"

"Create a new feature folder structure for real-time messaging:
/features/messaging/
  ├── components/
  ├── hooks/
  ├── services/
  ├── types/
  └── __tests__/"
```

**Last-mile implementation:**

```
"We're shipping tomorrow. Handle these final tasks:
1. Add telemetry to track feature adoption
2. Generate rollback script
3. Create feature flag configuration
4. Write deployment runbook
5. Update changelog"
```

**From Anthropic's Product Engineer:**

> "I was in meetings all day and still merged 4 PRs because Claude Code was working in the background."

**Product feedback to code:**

```
"Here's feedback from our product manager:

'Users are confused by the checkout flow. We need to add:
- Progress indicator showing steps
- Ability to edit cart from review page
- Clearer error messages for payment failures
- Save for later functionality'

Generate a technical plan and starter implementation."
```

### Use Case 6: Staying in Flow

**Pattern: Capture work for later without context switching**

**From Anthropic's teams:** Claude Code helps engineers stay productive when schedules are fragmented with interruptions, meetings, and on-call duties.

**Example prompts:**

```
"I noticed a potential XSS vulnerability but I'm working on something else.
Create a security issue:
- Describe the vulnerability
- Provide example exploit
- Suggest fix
- Estimate severity
Save as SECURITY-001.md for me to review later."

"I'm about to go into meetings. Here's what I'm working on [explain context].
Generate a plan to continue when I return:
- Current progress summary
- Next steps breakdown
- Open questions to resolve
- Files that need attention"

"Stub out the retry logic with proper structure and add TODOs.
I'll implement the exponential backoff later."
```

**From Anthropic's Backend Engineer:**

> "If I spot a drive‑by fix, I fire a Codex task instead of swapping branches and review its PR when I'm free."

**Drive-by fixes:**

```
"I noticed we're not handling the 429 rate limit error from the email API.
Add proper retry logic with exponential backoff.
Work autonomously - I'll review the PR later."
```

### Use Case 7: Exploration & Ideation

**Pattern: Find alternatives and validate design decisions**

**Example prompts:**

```
"How would this authentication system work if we used OAuth2 instead of JWT?
Compare both approaches on:
- Implementation complexity
- Security model
- User experience
- Migration path from current system"

"Show me 3 different ways to implement real-time updates:
1. WebSockets
2. Server-Sent Events
3. Polling with optimizations

For each, explain trade-offs for our use case."

"I fixed a bug where we weren't validating email format.
Find similar validation gaps across the codebase."

"Rewrite this imperative code in a more functional style:
- Avoid mutation
- Use pure functions
- Prefer composition over loops"
```

**From Anthropic's Performance Engineer:**

> "After I fix a bug I ask Claude where similar bugs might lurk, then spin follow‑up tasks."

**Architecture exploration:**

```
"Our current architecture uses a monolith. Explore what it would take to:
1. Split into microservices
2. Identify service boundaries
3. Estimate migration effort
4. Highlight risks and benefits

Don't implement - just analyze and document."
```

### Use Case 8: Database Work

**Pattern: Schema design, migrations, and queries**

**Example prompts:**

```
"Design a database schema for a multi-tenant SaaS application with:
- Organizations (teams)
- Users (belong to orgs)
- Projects (belong to orgs)
- Tasks (belong to projects)
Include proper foreign keys, indexes, and created_at/updated_at timestamps."

"Create a Drizzle migration to add a 'stripe_customer_id' column to users table:
- Make it optional (nullable)
- Add an index for faster lookups
- Include rollback migration"

"This query is slow [paste query]. Optimize it:
- Add appropriate indexes
- Restructure joins if needed
- Consider query caching
- Explain the performance improvement"

"Write a seed script to populate test data:
- 5 organizations
- 20 users (distributed across orgs)
- 50 projects
- 200 tasks
Use realistic data with Faker.js"
```

### Use Case 9: API Development

**Pattern: End-to-end API implementation**

**Example prompts:**

```
"Implement POST /api/projects endpoint:

Contract (use ts-rest):
- Body: { name: string, description: string, organizationId: string }
- Response: { project: Project }
- Errors: 400 (validation), 401 (unauthorized), 404 (org not found)

Implementation:
1. Define contract in packages/core/contracts/projects.ts
2. Add Zod validation schema
3. Implement route handler in apps/server/src/modules/projects.ts
4. Add database query in apps/server/src/infra/database/queries/projects.ts
5. Update API client in packages/sdk
6. Write integration tests

Follow our existing patterns in /api/organizations"
```

**API versioning:**

```
"We need to version our API. Design a system for:
- Route prefixing (v1, v2, etc)
- Header-based versioning
- Deprecation warnings
- Migration guides between versions

Implement v2 of /users endpoint with breaking changes documented."
```

### Use Case 10: Frontend Development

**Pattern: Component creation with proper architecture**

**Example prompts:**

```
"Create a reusable DataTable component in packages/ui:

Features:
- Sortable columns
- Pagination
- Row selection
- Loading state
- Empty state
- Error handling
- Responsive (mobile-friendly)

Props:
- data: T[]
- columns: ColumnDef<T>[]
- onRowClick?: (row: T) => void
- isLoading?: boolean
- error?: Error

Use Tailwind for styling. Include Storybook stories."
```

**From Anthropic's Product Design team:**

> "By pasting mockup images into Claude Code, we generate fully functional prototypes that engineers can immediately understand and iterate on."

**Rapid prototyping:**

```
"Here's a Figma mockup [paste image]. Build a React component that matches:
- Exact spacing and typography
- Responsive breakpoints
- Hover/focus states
- Accessibility (ARIA labels, keyboard nav)

Use our design system from packages/ui where possible."
```

---

## For Complex Tasks: Use Structured Prompts

**If your task requires 5+ files OR 300+ lines OR architectural changes:**

Instead of informal prompts, use structured templates from:

**→ [agent-prompts.md](../../agent/agent-prompts.md)** - Task templates by complexity

- Template 1: Simple Task (Direct Execution)
- Template 2: Feature Task (Checkpointed)
- Template 3: Refactoring Task (Multi-Phase)
- Template 4: Bug Fix Task (Test-Driven)
- Template 5: Architecture Change (Human-Supervised)

**Why use templates?**

- Forces explicit planning and decomposition
- Includes verification loops at every checkpoint
- Prevents half-completed work and context drift
- Provides clear rollback points
- Ensures human approval for risky changes

**Also see:**

- [complex-tasks.md](../../agent/complex-tasks.md) - Decomposition strategies
- [agent-self-check.md](../../agent/agent-self-check.md) - Self-verification protocol

---

_Last Updated: 2025-12-29_
