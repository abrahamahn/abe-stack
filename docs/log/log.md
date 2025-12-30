# ABE Stack Change Log

2024-12-29

- Aligned API prefixing under `/api`, kept client base URL host-only, added optional `fetchImpl` to api-client, and enforced lazy JWT secret loading without dev fallback.
- Introduced `@abeahn/storage` with local and S3 providers; mapped storage env via `packages/shared/src/storageConfig.ts`; decorated Fastify with `storage` and updated types.
- Cleaned unused auth middleware duplication; ESLint fixes (drizzle ignore path, deduped rules, console allowed for scripts); added auth route tests and Playwright auth scaffold gated by `E2E_BASE_URL`.
- Added UI primitives (`Flex`, `Stack`, `Text`, `Heading`, `Surface`) with shared `primitives.css`, exported via `@abeahn/ui`.
- Expanded UI primitives with `Divider`, `Spacer`, `Grid`, `Container`, `VisuallyHidden` to cover layout, spacing, and accessibility basics.
- Added more UI primitives: `Kbd`, `Code`, `Tag`, `List` for shortcuts, inline code, pill labels, and styled lists.
- Further expanded UI primitives with `Icon`, `Avatar`, `IconButton`, `Chip`, `BadgePrimitive` for iconography, avatars, compact actions, pill chips, and badges.
- Added Tooltip, CardPrimitive, Pill, and Link primitives with supporting styles.
- Namespaced UI exports to avoid Badge name clashes (`components` vs `primitives`).
- Added Tabs, Accordion, Toast, LinkButton primitives and enhanced styles for link, card, and navigation patterns.
- Added Overlay, Modal, Drawer, Progress, Skeleton, Breadcrumbs to round out core layout/feedback primitives.
- Added Alert, InputPrimitive, TextArea, Select to cover form and status primitives.
- Added Dropdown/MenuItem, Pagination, Table, Steps, Slider primitives to round out data display and navigation controls.
- Added Popover, Timeline, Tree, ContextMenu primitives and supporting styles.
- Added Switch, Checkbox, Radio, FormField primitives and form/control styling updates.
- Added BadgeDot and Stat primitives for status dots and KPI summaries.
- Pruned primitives to a lean, Radix-style set (~25): Accordion, Alert, Avatar, Badge, CardPrimitive, Checkbox, Divider, Dropdown/MenuItem, Heading, InputPrimitive/TextArea, Modal/Overlay, Pagination, Popover, Progress, Radio, Select, Skeleton, Slider, Switch, Tabs, Text, Toast, Tooltip, VisuallyHidden.
- Added initial UI primitive tests for Accordion (toggle/aria-expanded) and Modal (open/close via overlay).
- Added Dialog compound API (Root, Trigger, Overlay, Content, Title, Description) with initial RTL tests.
- Added RTL tests for Tabs, Dropdown, Select.
- Tabs now support arrow key navigation; Dropdown test covers selection close.
- Dropdown now closes on Escape (keyboard); tests updated.
- Added keyboard/focus tests for Dropdown (Escape returns focus), Tabs (arrow navigation), Popover (Escape closes), Checkbox/Radio (space toggles).
- Dialog now restores focus on close and focuses first focusable on open (basic trap); Dropdown/Popover triggers are keyboard-activatable and close on Escape.

2024-12-30

- Fixed import ordering in server bootstrap/types and hardened storage factory exhaustiveness without unused locals.
- Standardized UI primitives to use `ReactElement` return types, resolved JSX namespace noise, and re-exported core components/primitives directly for app imports.
- Adjusted DB env typing to allow boolean flags (S3 path style) and aligned server env typing.
- Updated Vite configs (web/desktop) to skip port discovery during builds and moved web build output to `apps/web/build` to avoid permission issues.
- Cleaned auth route tests to use DbClient-compatible stubs and ensured pnpm build now passes end-to-end.

2024-12-31

- Added UI infra folders: hooks (useDisclosure, useControllableState, useClickOutside, useMediaQuery), theme tokens (colors, spacing, typography), layouts (Container, AuthLayout, SidebarLayout, StackedLayout), and utils (cn) exported via @abeahn/ui.
- Refactored Accordion/Dropdown/Popover/Dialog to use new controlled-state hooks and disclosure helper; Dropdown supports function children for close handling.
- Added ComponentGallery page and /components route in apps/web to visualize primitives; added Toaster + toast store (zustand/nanoid) and global ApiProvider using @ts-rest/react-query with error interception and 401 logout.
- Added export:ui script writing ui_code.txt at repo root; eslint ignores export script.
- Consolidated ComponentGallery/StyleGuide into a single demo view under apps/web/src/demo with a /demo route to keep showcase code isolated from the main app.
- Refined primitives CSS with polished tokens, light/dark theme via prefers-color-scheme, and variable-driven tones for badges/alerts/progress/switch to improve consistency.
- Increased dark-mode text contrast for better readability across all primitives.
- Portaled dialog overlay/content to body, wrapped dialogs in FocusTrap for a11y, simplified cn helper, and added polymorphic Text/Heading typing for better DX.
- Applied UI theme variables globally in web entry by importing primitives.css and aligning base body styles to theme colors; cleaned legacy index.css styling.

2025-12-29 (Session 1)

- **Major Documentation Overhaul:** Created comprehensive CLAUDE.md and AGENTS.md to establish coding principles, architecture guidelines, and AI agent development workflows.

2025-12-29 (Session 2)

- **Documentation Refactoring for Context Window Optimization:**
  - Split CLAUDE-comprehensive.md (2652 lines, ~22,500 tokens) into modular dev/ structure
  - Optimized for AI context window efficiency (2-5k words per file vs 15k+ words single file)
  - Prevents "attention dilution" and "lost in the middle" effects in LLM processing
- **CLAUDE.md Enhancements:**
  - Documented DRY principle, separation of concerns, React-as-renderer-only architecture
  - Added framework-agnostic core principles and minimal dependency philosophy
  - Created detailed workflow sections: feature implementation, bug fixes, legacy code removal, testing strategy
  - Added comprehensive common patterns: API client, form handling, environment variables, database queries
  - Documented anti-patterns with clear examples (business logic in components, duplicate types, cross-app imports, prop drilling)
  - Added extensive use case examples from Anthropic/OpenAI teams: code navigation, refactoring, performance optimization, test generation, development velocity
  - Implemented mandatory pre-completion checklist: format, lint, type-check, test (all must pass)
  - Added autonomous work guidelines with self-verification loops and checkpoint patterns
  - Created documentation workflow section (Section 5) covering log/log.md, TODO.md, dev/testing/index.md usage
- **AGENTS.md:** Created quick reference guide for AI agents with links to CLAUDE.md, core principles summary, package structure overview, and mandatory documentation requirements
- **Documentation Structure:**
  - Established `log/log.md` as the comprehensive change log (this file)
  - Defined `TODO.md` format for active task tracking with status markers
  - Referenced `dev/testing/index.md` for testing strategy and patterns
  - Added `log/milestone.md` for high-level project state tracking
- **AI Agent Workflow:**
  - Start of session: Read TODO.md, log/log.md, dev/testing/index.md, CLAUDE.md
  - During work: Update TODO.md with task progress, mark blockers
  - End of session: Update log/log.md with changes/decisions, update TODO.md with completed tasks, run pre-completion checklist
- **Quality Gates:** Enforced non-negotiable pre-completion checks preventing any task from being marked complete without passing format, lint, type-check, and test
- **Files Created:**
  - `CLAUDE.md` (2600+ lines) - Complete development guide
  - `AGENTS.md` (75+ lines) - AI agent quick reference
- **Files Modified:**
  - `log/log.md` - This entry
  - `log/milestone.md` - Updated to reflect documentation structure
- **Impact:** Established single source of truth for development standards, enabling consistent code quality across human and AI contributions, with mandatory documentation practices preventing knowledge loss.

2025-12-29 (Session 3)

- **Documentation Consolidation & Structure Finalization:**
  - Merged `log/dev/principles/index.md` → `dev/principles/index.md` (518 lines)
  - Added `packages/storage` to dev/principles/index.md framework-agnostic section
  - Maintained proper structure: log/log.md and log/milestone.md remain in `log/`
- **Separation of Concerns Between dev/principles/index.md and dev/architecture/index.md:**
  - **dev/principles/index.md (THE "WHY")**: Refactored to focus on philosophy, rationale, and trade-offs
    - Vision & core values (velocity over perfection, simplicity over cleverness)
    - WHY behind each principle (17 principles with detailed rationale)
    - Trade-offs we accept vs. alternatives we reject
    - Development, security, performance, and communication philosophy
    - No implementation details or code examples
  - **dev/architecture/index.md (THE "HOW")**: Refactored to focus on concrete implementation
    - Monorepo structure with file paths
    - 4-layer architecture with code examples (Presentation, State, Business Logic, Data)
    - Dependency flow rules and enforcement
    - Package organization patterns (DRY, framework-agnostic, API client split)
    - Import patterns, folder structure, file naming conventions
    - Detailed code examples for each layer
    - No philosophical explanations or rationale
  - **Clear cross-references**: Each file points to the other for complementary information
- **CLAUDE.md Updates:**
  - Added `dev/principles/index.md` to "Deep Dives" section
  - dev/principles/index.md documented as foundational "why" behind architectural decisions
- **Final Documentation Structure:**
  - Root: `CLAUDE.md`, `AGENTS.md`
  - `docs/`: `TODO.md`, `TEST.md`
  - `log/`: `log/log.md`, `log/milestone.md`
  - `dev/`: `dev/principles/index.md`, `dev/architecture/index.md`, `dev/workflows/index.md`, `dev/coding-standards/index.md`, `dev/patterns/index.md`, `dev/anti-patterns/index.md`, `dev/performance/index.md`, `dev/use-cases/index.md`, `dev/testing/index.md`
- **Files Modified:**
  - `dev/principles/index.md` - Complete rewrite focusing on WHY (612 lines, ~4.5k words)
  - `dev/architecture/index.md` - Complete rewrite focusing on HOW (887 lines, ~6k words)
- `CLAUDE.md` - Added dev/principles/index.md to Deep Dives list
  - `log/log.md` - This entry
- **Impact:**
  - Eliminated ~70% content duplication between dev/principles/index.md and dev/architecture/index.md
  - Clear separation: PRINCIPLES = philosophy/rationale, ARCHITECTURE = implementation/examples
  - Developers can now understand "why we do this" (PRINCIPLES) and "how to do it" (ARCHITECTURE) independently
  - Improved AI context window efficiency with focused, non-overlapping documents

2025-12-29 (Session 4)

- Normalized agent doc references to point at `agent/complex-tasks.md`, `log/log.md`, and `dev/testing/index.md`.
- Aligned template numbering in `CLAUDE.md` with `agent/agent-prompts.md` (Template 1 Feature, 2 Refactor, 3 Bug Fix, 4 Architecture).
- Added a balanced testing matrix (30% fast loop, 70% full suite) to `dev/testing/index.md` and `dev/workflows/index.md`.

2025-12-29 (Session 5)

- Split large docs into focused modules under `dev/architecture`, `dev/testing`, and `dev/workflows`.
- Replaced `dev/architecture/index.md`, `dev/testing/index.md`, and `dev/workflows/index.md` with short indexes to the new modules.
- Added `INDEX.md` as a low-token entry point for doc discovery.
- Moved long examples into appendices to reduce prompt bloat.

2025-12-29 (Session 6)

- Updated CLAUDE and agent workflow docs to avoid auto-fixing pre-existing lint/type-check/test failures; report them instead.

2025-12-29 (Session 7)

- Split principles into core and rationale modules under `dev/principles`, and turned `dev/principles/index.md` into a short index.
- Compressed `dev/patterns/index.md` and `dev/anti-patterns/index.md` into table-first summaries with appendix examples.
- Enhanced `INDEX.md` with keyword routing and added INDEX-first loading guidance to `agent/agent-prompts.md`.
- Updated Last Updated stamps to 2025-12-29.

2025-12-29 (Session 8)

- Fixed lint and type-check issues in history navigation, UI primitives, and tooling scripts (types, cleanup returns, and safe value handling).

2025-12-29 (Session 9)

- Added context retention state summaries, resume mode guidance, persistence strategy, and tool-assisted validation to agent docs.
- Added session bridge doc and linked it from workflows and index keyword routing.
- Added migration/overhaul classification guidance.

2025-12-29 (Session 10)

- Moved CLAUDE.md, AGENTS.md, and GEMINI.md into `docs/` and updated references to use `INDEX.md`, `dev/`, `agent/`, and `log/` paths.

2025-12-29 (Session 11)

- Renamed dev overview docs to `index.md` inside their modules (architecture, testing, workflows, principles, patterns, anti-patterns) and updated references.

2025-12-29 (Session 12)

- Updated `CLAUDE.md` documentation table to point at `dev/.../index.md` paths.
- Fixed remaining cross-doc links to new `index.md` locations and corrected relative paths for `CLAUDE.md` in appendix examples.
- Normalized historical references in this log to current doc paths.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).

2025-12-29 (Session 13)

- Renamed agent docs to lowercase hyphenated filenames and updated references (`agent-prompts.md`, `agent-self-check.md`, `complex-tasks.md`, `session-bridge.md`).
- Moved `dev/CODING_STANDARDS.md`, `dev/PERFORMANCE.md`, and `dev/USE_CASES.md` into module folders and renamed to `index.md`.
- Updated cross-doc references to new `dev/coding-standards/index.md`, `dev/performance/index.md`, and `dev/use-cases/index.md` paths.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).

2025-12-29 (Session 14)

- Renamed `docs/log/LOG.md` → `docs/log/log.md` and `docs/log/MILESTONE.md` → `docs/log/milestone.md`.
- Updated references across docs to use `log/log.md` and `log/milestone.md`.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).

2025-12-29 (Session 15)

- Clarified `/agent` vs `/dev` scope in `docs/INDEX.md`.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).
- Tests re-run: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` still fails in `apps/web` (no test files found).
- Tests re-run again: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` still fails in `apps/web` (no test files found).
- Tests re-run final: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` still fails in `apps/web` (no test files found).

2025-12-29 (Session 16)

- Updated `README.md` with doc quicklinks, fast vs full startup guidance, guardrails, and test caveat for `apps/web`.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).

2025-12-29 (Session 17)

- Added README sections for why ABE Stack, Docker-first 5-minute run, architecture diagram, and badges.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).
- Tests re-run: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` still fails in `apps/web` (no test files found).
- Tests re-run again: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` still fails in `apps/web` (no test files found).

2025-12-29 (Session 18)

- Added velocity tips to `docs/INDEX.md`.
- Standardized dev index files with Quick Summary/Modules/Key Patterns/See Also.
- Added `docs/dev/templates/index-template.md` and `docs/dev/examples.md`.
- Expanded `docs/AGENTS.md` to a full agent guide.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).

2025-12-29 (Session 19)

- Updated TODO to include demo docs display requirement for `/demo`.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).
