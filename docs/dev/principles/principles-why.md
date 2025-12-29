# ABE Stack - Coding Principles & Technical Vision

Foundational principles and technical vision for the ABE Stack. Learn the "why" behind architectural decisions.

**Quick Reference:** See [CLAUDE.md](../../CLAUDE.md) for essentials.
**Implementation Details:** See [dev/architecture/index.md](../architecture/index.md) for the "how".

---

## Vision

**ABE Stack is a production-ready, developer-velocity-first monorepo boilerplate that developers can understand in a day, extend with confidence, and ship to production without surprises.**

### Core Values

1. **Velocity over Perfection** - Ship working software fast, iterate based on real usage
2. **Simplicity over Cleverness** - Prefer boring, obvious solutions
3. **Type Safety over Runtime Checks** - Catch errors at compile time
4. **Framework-Agnostic Core** - Business logic independent of UI frameworks
5. **Lean but Complete** - Minimal dependencies, maximum production-readiness

---

## Why These Principles Matter

### Principle 1: DRY (Don't Repeat Yourself)

**Why we enforce DRY:**

- **Single source of truth** prevents inconsistencies across the codebase
- **Changes propagate automatically** to all consumers when you update shared code
- **Reduces maintenance burden** - fix bugs once, not three times
- **Makes refactoring safer** - change in one place, TypeScript catches all affected code
- **Enables confidence** - no hidden duplicates that might behave differently

**Trade-offs we accept:**

- Initial extraction takes more time upfront
- Requires understanding package boundaries
- Must maintain backward compatibility in shared packages

**The alternative (duplication) leads to:**

- Divergent implementations that start identical but drift apart
- Bug fixes missed in some copies
- Merge conflicts when multiple teams touch duplicated code
- Technical debt that compounds over time

---

### Principle 2: Clear Separation of Concerns

**Why we separate layers:**

- **Easier to understand** - each layer has ONE job, reducing cognitive load
- **Enables platform flexibility** - same business logic works on Web, Desktop, Mobile
- **Simplifies testing** - test business logic without React overhead
- **Allows layers to evolve independently** - change UI framework without touching business logic
- **Reduces debugging time** - know exactly where logic lives

**Trade-offs we accept:**

- More files and packages to navigate initially
- Requires discipline to not mix concerns
- Junior developers need guidance on "where does this code go?"

**The alternative (mixed concerns) leads to:**

- Components with 500+ lines mixing UI, logic, and data fetching
- Impossible to reuse logic across platforms
- Brittle tests that break when unrelated code changes
- Vendor lock-in to specific frameworks

---

### Principle 3: React as Renderer Only

**Why we restrict React's role:**

- **Easier to test** - test business logic as pure functions without React Testing Library
- **Easier to migrate** - when React 25 breaks everything, business logic is unaffected
- **Clearer responsibilities** - components are thin wrappers around logic
- **Better performance** - business logic can be memoized separately from rendering
- **Reusability** - same logic works in React, Solid, Svelte, or server-side

**Trade-offs we accept:**

- More files (components + business logic + hooks)
- Requires understanding of proper layer boundaries
- Can feel like "over-engineering" for simple UIs

**The alternative (logic in components) leads to:**

- Untestable business logic buried in useEffect
- Copy-pasting logic between components
- Framework lock-in
- Performance issues from unnecessary re-renders

---

### Principle 4: Framework-Agnostic Core

**Why we keep core logic framework-free:**

- **Migration flexibility** - frameworks come and go, business logic is permanent
- **Platform portability** - same validation works on Web, Desktop, Mobile, CLI
- **Testing simplicity** - test pure functions, not framework-specific code
- **Bundle size optimization** - tree-shake framework dependencies from shared code
- **Team autonomy** - different teams can choose different UI frameworks

**Trade-offs we accept:**

- Cannot use React hooks in shared packages
- Requires exporting both "pure" functions and "React hook" wrappers
- Need clear documentation on what goes where

**The alternative (framework-coupled logic) leads to:**

- Complete rewrite when changing frameworks
- Duplicate logic for different platforms
- Large bundle sizes from unnecessary framework dependencies
- Vendor lock-in

---

### Principle 5: Minimal Dependencies

**Why we minimize dependencies:**

- **Smaller bundle sizes** - every dependency adds to the final bundle
- **Fewer security vulnerabilities** - each dependency is an attack surface
- **Less dependency churn** - fewer breaking changes from upstream packages
- **Easier to understand** - simpler codebase, less "magic"
- **Reduced maintenance burden** - fewer packages to update and debug

**Decision framework:**

1. **Can I implement this in < 50 lines?** → Write it yourself
2. **Does it solve a complex problem?** (date handling, state management) → Use a library
3. **Is it actively maintained?** → Check last commit date
4. **Is it widely used?** → Check npm downloads

**Trade-offs we accept:**

- Writing utility functions ourselves takes time upfront
- Reinventing wheels for simple cases
- Missing out on some ecosystem innovations

**The alternative (dependency-heavy) leads to:**

- 200MB node_modules for a simple app
- Breaking changes every week
- Abandoned dependencies that become security risks
- "Works on my machine" issues from version mismatches

---

### Principle 6: Type Safety Everywhere

**Why we enforce strict TypeScript:**

- **Catch bugs at compile time** - before users see them
- **Self-documenting code** - types are always up-to-date documentation
- **Better IDE autocomplete** - catch typos and API changes instantly
- **Refactoring with confidence** - TypeScript finds every affected line
- **Runtime + compile-time safety** - Zod validates external data

**Trade-offs we accept:**

- More verbose code (type annotations)
- Initial learning curve for TypeScript features
- Slower iteration when fighting type errors

**The alternative (`any` everywhere) leads to:**

- Runtime errors in production
- Guessing what properties objects have
- Breaking changes that TypeScript would have caught
- Defensive programming with excessive runtime checks

---

## Development Philosophy

### Principle 7: TDD With Real Usage and Edge Cases

**Why we require TDD and real usage tests:**

- **Fast feedback loop** - failing tests pinpoint missing behavior
- **High value** - real usage and edge cases reveal true breakpoints
- **Regression protection** - every bug gets a failing test first
- **Long-lasting** - behavior-focused tests survive refactors
- **Confidence to refactor** - tests drive the correct fixes

**Testing strategy:**

- 70% unit tests (business logic in `packages/shared`)
- 20% integration tests (API routes + DB)
- 10% E2E tests (critical user flows)

**Why NOT test React heavily:**

- React tests are slow (mounting components, DOM queries)
- React tests are brittle (break on UI refactors)
- React is already tested by the React team
- Most React components are just rendering logic

**TDD rules:**

- Write the failing test first.
- Confirm the failure before touching production code.
- Fix the production code; do not rewrite tests to make failures disappear unless the requirement changed.
- Include failure modes and boundary conditions as first-class tests.

**Trade-offs we accept:**

- UI bugs might slip through unit tests
- Need E2E tests for complex interactions
- Requires discipline to extract testable logic

---

### Principle 8: Documentation as Code

**Why we maintain docs rigorously:**

- **Prevents knowledge loss** - when someone leaves, knowledge stays
- **Onboards new developers faster** - they can read docs and be productive
- **Documents decisions and trade-offs** - future you will thank past you
- **Enables AI agents** - Claude needs docs to work effectively
- **Creates shared understanding** - whole team aligned on patterns

**Required documentation:**

- `log/log.md` - Every significant change logged with rationale
- `TODO.md` - Current tasks tracked
- `dev/testing/index.md` - Testing patterns documented
- `CLAUDE.md` - Coding standards updated
- JSDoc for complex functions

**File header convention:**

New files must begin with a first-line comment containing the workspace-relative
path. This improves reviewability and file provenance when reading in isolation.

**Trade-offs we accept:**

- Documentation takes time to maintain
- Can become outdated if not disciplined
- Need to remember to update docs

**The alternative (no docs) leads to:**

- "How does this work?" → "Ask Bob, he wrote it" → Bob left 6 months ago
- Tribal knowledge that only 1-2 people have
- Repeated mistakes because decisions weren't documented
- Slow onboarding for new team members

---

### Principle 9: Quality Gates

**Why we enforce quality gates:**

- **Prevents broken code from reaching main** - catch issues before merge
- **Maintains consistent code style** - no debates about formatting
- **Catches bugs before production** - TypeScript + tests are safety nets
- **Enables confident deployments** - if it passes, it ships
- **Forces discipline** - can't skip tests or ignore lint errors

**Non-negotiable checks:**

```bash
pnpm format      # Prettier
pnpm lint        # ESLint
pnpm type-check  # TypeScript
pnpm test        # Vitest + Playwright
```

**Trade-offs we accept:**

- Takes time to fix linting/type errors
- Sometimes gates feel restrictive
- Can slow down "quick experiments"

**The alternative (no gates) leads to:**

- Production bugs that tests would have caught
- Inconsistent code style across files
- TypeScript errors ignored with `//@ts-ignore`
- "Works on my machine" syndrome

---

### Principle 10: Production-Ready Defaults

**Why we include production concerns upfront:**

- **Ship to production on day 1** - no surprises when going live
- **Security by default** - don't add auth as an afterthought
- **No "we'll add that later"** - later never comes
- **Confidence in production** - it's been tested from day 1
- **Lean but complete** - includes what you need, excludes what you don't

**What we include:**

- ✅ Authentication & authorization
- ✅ Input validation (Zod)
- ✅ Error handling & boundaries
- ✅ Security headers (Helmet)
- ✅ Health checks
- ✅ Structured logging
- ✅ Database migrations

**What we exclude (add when needed):**

- Feature flags
- Analytics
- Monitoring/APM
- Localization
- Advanced theming

**Trade-offs we accept:**

- More complex starter template
- Learning curve for all the production features
- Some projects won't need all features

**The alternative (minimal starter) leads to:**

- Security issues discovered in production
- Rushed auth implementation before launch
- Missing error handling causing mysterious bugs
- "Works in dev, breaks in prod"

---

## Code Organization Philosophy

### Principle 11: Monorepo Package Boundaries

**Why we enforce strict boundaries:**

- **Clear ownership** - each package has a specific purpose
- **Prevents circular dependencies** - one-way dependency flow
- **Enables independent versioning** - packages can evolve separately
- **Simplifies reasoning** - know exactly what depends on what
- **Prevents leaky abstractions** - apps can't reach into package internals

**Dependency flow:**

```
apps → packages → shared (leaf package)
```

**Trade-offs we accept:**

- Can't directly import from apps in packages
- Need to plan package structure upfront
- Moving code between packages requires refactoring

**The alternative (no boundaries) leads to:**

- Circular dependencies that break builds
- Apps importing from other apps
- Spaghetti code where everything depends on everything
- Impossible to extract packages to separate repos

---

### Principle 12: Colocate Related Code

**Why we colocate:**

- **Easier to find related files** - test lives next to code
- **Reduces navigation time** - don't hunt across folders
- **Clear ownership** - one folder contains everything for a feature
- **Reduces cognitive load** - related code is physically close

**Trade-offs we accept:**

- More nested folder structure
- Multiple `index.ts` files

**The alternative (group by type) leads to:**

- `/components`, `/hooks`, `/utils` folders with 100+ files
- Hard to find which test goes with which component
- Jumping between distant folders

---

### Principle 13: Explicit Over Implicit

**Why we prefer explicitness:**

- **Code is read more than written** - optimize for readers
- **Reduces mental overhead** - no guessing what's happening
- **Makes debugging easier** - clear what each line does
- **Helps AI agents** - Claude understands explicit code better

**Examples:**

- ✅ Named exports (not default exports)
- ✅ Explicit error handling (try/catch, not silent failures)
- ✅ Explicit dependencies (import what you use)
- ✅ Descriptive names (`getUserById`, not `get`)

**Trade-offs we accept:**

- More verbose code
- Longer import statements

**The alternative (implicit) leads to:**

- "Where is this function from?"
- Silent failures that are hard to debug
- Magic that only the author understands

---

## Security Philosophy

### Principle 14: Security by Default

**Why we default to secure:**

- **Prevents production incidents** - security baked in from day 1
- **Reduces decision fatigue** - don't have to remember to add security
- **Industry best practices** - follows OWASP guidelines
- **Peace of mind** - sleep well knowing defaults are secure

**Non-negotiable defaults:**

- HTTPS in production
- Helmet for security headers
- CORS properly configured
- JWT with expiration
- httpOnly cookies for tokens
- Bcrypt for password hashing
- Rate limiting on auth endpoints
- Parameterized queries (Drizzle prevents SQL injection)

**Trade-offs we accept:**

- Slightly more complex initial setup
- Need to understand security concepts
- Can't take shortcuts

**The alternative (add security later) leads to:**

- Security vulnerabilities discovered in production
- Rushed fixes that introduce new bugs
- Data breaches
- User trust lost

---

## Performance Philosophy

### Principle 15: Optimize for Developer Experience First

**Why we prioritize developer velocity:**

- **Premature optimization wastes time** - 90% of code isn't performance-critical
- **Developer velocity compounds** - faster development → more features → more value
- **Most code is fast enough** - modern computers are fast
- **Optimization needs data** - profile first, optimize second

**Order of priorities:**

1. **Correctness** - Does it work?
2. **Clarity** - Can others understand it?
3. **Maintainability** - Can it be changed easily?
4. **Performance** - Is it fast enough?

**When to optimize:**

- ⚠️ After profiling shows a bottleneck
- ⚠️ For frequently executed code paths (hot loops)
- ⚠️ When users complain about slowness

**When NOT to optimize:**

- ❌ "This might be slow" (measure first)
- ❌ Startup code (runs once)
- ❌ Admin pages (low traffic)

**Trade-offs we accept:**

- Some code could theoretically be faster
- Optimization opportunities missed
- Learning curve for profiling tools

**The alternative (premature optimization) leads to:**

- Complex, unreadable code
- Time wasted optimizing code that runs once
- Technical debt from "clever" solutions

---

## Communication Philosophy

### Principle 16: Comments Explain "Why", Code Explains "What"

**Why we separate what from why:**

- **Code is self-documenting** - good names explain what happens
- **Comments age poorly** - they get out of sync with code
- **"Why" is valuable** - explains decisions and context
- **Reduces noise** - no redundant comments

**When to comment:**

- WHY a decision was made
- WHY the obvious solution doesn't work
- WHY this workaround exists
- Business rules that aren't obvious from code

**When NOT to comment:**

- WHAT the code does (code should be clear)
- OBVIOUS operations (don't comment `// loop through users`)

**Trade-offs we accept:**

- Need to write clear, self-explanatory code
- Less documentation for simple operations

**The alternative (comment everything) leads to:**

- Outdated comments that lie
- Noise that obscures important information
- Comments explaining obvious code

---

### Principle 17: Decisions Must Be Documented

**Why we document decisions:**

- **Future context** - "Why did we choose JWT over sessions?"
- **Prevents re-litigating** - decision was made, documented, move on
- **Knowledge transfer** - new team members understand choices
- **Trade-off transparency** - acknowledges alternatives considered

**Where to document:**

- **Code comments** - for in-file architectural decisions
- **log/log.md** - for project-level decisions
- **CLAUDE.md** - for coding pattern changes

**Decision format:**

```typescript
/**
 * Authentication Strategy Decision
 *
 * Decision: JWT with refresh tokens
 * Rationale: Horizontal scaling without shared session storage
 * Trade-offs: More complex than single token, better security
 * Alternatives considered: Session-based (doesn't scale), OAuth only
 * Date: 2025-01-15
 */
```

**Trade-offs we accept:**

- Takes time to document decisions
- Documentation can become outdated

**The alternative (undocumented decisions) leads to:**

- "Why did we do it this way?" → nobody knows
- Re-litigating old decisions
- Cargo cult code that nobody dares change

---

## Summary: The ABE Stack Way

**Philosophy in one sentence:**
_Build simple, typed, tested systems that ship fast and scale confidently._

**Core principles:**

1. **DRY** - Never duplicate code, extract to shared packages
2. **Separation** - React renders, shared handles logic, server manages data
3. **Type Safety** - TypeScript strict + Zod validation everywhere
4. **Framework-Agnostic** - Business logic independent of React
5. **Minimal Deps** - Only add when necessary
6. **Test-Driven** - Real usage and edge cases drive fixes
7. **Document** - log/log.md, TODO.md, dev/testing/index.md updated every session
8. **Quality Gates** - format + lint + type-check + test must pass
9. **Production-Ready** - Security, auth, validation included by default
10. **Developer First** - Optimize for velocity and clarity

**Goal:** A codebase that is:

- ✅ Easy to understand (new dev productive in 1 day)
- ✅ Easy to change (refactor with confidence)
- ✅ Easy to ship (production-ready out of the box)
- ✅ Hard to break (type safety + tests + quality gates)

**What we optimize for:**

- Developer velocity (ship features fast)
- Code clarity (understand in a day)
- Long-term maintainability (change with confidence)
- Production confidence (no surprises)

**What we DON'T optimize for:**

- Absolute performance (optimize when needed)
- Minimal file count (clarity > conciseness)
- Latest trends (boring > clever)
- Feature completeness (lean + extensible)

---

## Security & Privacy Principles

### Principle 18: Security by Default

**Why we default to secure:**

- **Prevents production incidents** - Security baked in from day 1
- **Reduces decision fatigue** - Don't have to remember to add security
- **Industry best practices** - Follows OWASP guidelines
- **Peace of mind** - Sleep well knowing defaults are secure

### Sensitive Data Handling

**NEVER log or expose:**

- ❌ API keys, tokens, secrets
- ❌ User passwords (even hashed)
- ❌ Personal identifying information (PII)
- ❌ Payment details (credit cards, bank accounts)
- ❌ Social security numbers, tax IDs
- ❌ Health information

**Always use:**

- ✅ Environment variables for secrets (`process.env.JWT_SECRET`)
- ✅ Zod validation for all user input
- ✅ Parameterized queries (Drizzle handles this automatically)
- ✅ Proper authentication checks on every protected route
- ✅ HTTPS in production
- ✅ httpOnly cookies for tokens
- ✅ CORS configuration
- ✅ Rate limiting on auth endpoints

**Example: Proper secret handling:**

```typescript
// ❌ BAD: Hardcoded secret
const token = jwt.sign({ userId: user.id }, 'my-secret-key');

// ❌ BAD: Logging sensitive data
console.log('User password:', user.password);

// ✅ GOOD: Environment variable
const token = jwt.sign({ userId: user.id }, env.JWT_SECRET);

// ✅ GOOD: Log without sensitive data
logger.info({ userId: user.id }, 'User logged in');
```

### Input Validation

**Always validate user input with Zod:**

```typescript
// ✅ GOOD: Validate all inputs
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(5),
  publishedAt: z.string().datetime().optional(),
});

app.post('/api/posts', async (request, reply) => {
  // Parse and validate
  const result = createPostSchema.safeParse(request.body);

  if (!result.success) {
    return reply.code(400).send({
      error: 'Validation failed',
      details: result.error.format(),
    });
  }

  // Guaranteed type-safe data
  const post = await createPost(result.data);
  return reply.code(201).send({ post });
});
```

**Trade-offs we accept:**

- Slightly more complex initial setup
- Need to understand security concepts
- Can't take shortcuts

**The alternative (add security later) leads to:**

- Security vulnerabilities discovered in production
- Rushed fixes that introduce new bugs
- Data breaches
- User trust lost

---

_For implementation details, see [dev/architecture/index.md](../architecture/index.md)_
_For testing strategies, see [dev/testing/index.md](../testing/index.md)_
_For workflows and commands, see [dev/workflows/index.md](../workflows/index.md)_
_For recent changes, see [log/log.md](../log/log.md)_
