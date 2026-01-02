# ABE Stack Change Log

2024-12-29

- Aligned API prefixing under `/api`, kept client base URL host-only, added optional `fetchImpl` to api-client, and enforced lazy JWT secret loading without dev fallback.
- Introduced `@abeahn/storage` with local and S3 providers; mapped storage env via `packages/shared/src/storageConfig.ts`; decorated Fastify with `storage` and updated types.
- Cleaned unused auth middleware duplication; ESLint fixes (drizzle ignore path, deduped rules, console allowed for scripts); added auth route tests and Playwright auth scaffold gated by `E2E_BASE_URL`.
- Added UI elements (`Flex`, `Stack`, `Text`, `Heading`, `Surface`) with shared `elements.css`, exported via `@abeahn/ui`.
- Expanded UI elements with `Divider`, `Spacer`, `Grid`, `Container`, `VisuallyHidden` to cover layout, spacing, and accessibility basics.
- Added more UI elements: `Kbd`, `Code`, `Tag`, `List` for shortcuts, inline code, pill labels, and styled lists.
- Further expanded UI elements with `Icon`, `Avatar`, `IconButton`, `Chip`, `BadgeElement` for iconography, avatars, compact actions, pill chips, and badges.
- Added Tooltip, CardElement, Pill, and Link elements with supporting styles.
- Namespaced UI exports to avoid Badge name clashes (`components` vs `elements`).
- Added Tabs, Accordion, Toast, LinkButton elements and enhanced styles for link, card, and navigation patterns.
- Added Overlay, Modal, Drawer, Progress, Skeleton, Breadcrumbs to round out core layout/feedback elements.
- Added Alert, InputElement, TextArea, Select to cover form and status elements.
- Added Dropdown/MenuItem, Pagination, Table, Steps, Slider elements to round out data display and navigation controls.
- Added Popover, Timeline, Tree, ContextMenu elements and supporting styles.
- Added Switch, Checkbox, Radio, FormField elements and form/control styling updates.
- Added BadgeDot and Stat elements for status dots and KPI summaries.
- Pruned elements to a lean, Radix-style set (~25): Accordion, Alert, Avatar, Badge, CardElement, Checkbox, Divider, Dropdown/MenuItem, Heading, InputElement/TextArea, Modal/Overlay, Pagination, Popover, Progress, Radio, Select, Skeleton, Slider, Switch, Tabs, Text, Toast, Tooltip, VisuallyHidden.
- Added initial UI element tests for Accordion (toggle/aria-expanded) and Modal (open/close via overlay).
- Added Dialog compound API (Root, Trigger, Overlay, Content, Title, Description) with initial RTL tests.
- Added RTL tests for Tabs, Dropdown, Select.
- Tabs now support arrow key navigation; Dropdown test covers selection close.
- Dropdown now closes on Escape (keyboard); tests updated.
- Added keyboard/focus tests for Dropdown (Escape returns focus), Tabs (arrow navigation), Popover (Escape closes), Checkbox/Radio (space toggles).
- Dialog now restores focus on close and focuses first focusable on open (basic trap); Dropdown/Popover triggers are keyboard-activatable and close on Escape.

2024-12-30

- Fixed import ordering in server bootstrap/types and hardened storage factory exhaustiveness without unused locals.
- Standardized UI elements to use `ReactElement` return types, resolved JSX namespace noise, and re-exported core components/elements directly for app imports.
- Adjusted DB env typing to allow boolean flags (S3 path style) and aligned server env typing.
- Updated Vite configs (web/desktop) to skip port discovery during builds and moved web build output to `apps/web/build` to avoid permission issues.
- Cleaned auth route tests to use DbClient-compatible stubs and ensured pnpm build now passes end-to-end.

2024-12-31

- Added UI infra folders: hooks (useDisclosure, useControllableState, useClickOutside, useMediaQuery), theme tokens (colors, spacing, typography), layouts (Container, AuthLayout, SidebarLayout, StackedLayout), and utils (cn) exported via @abeahn/ui.
- Refactored Accordion/Dropdown/Popover/Dialog to use new controlled-state hooks and disclosure helper; Dropdown supports function children for close handling.
- Added ComponentGallery page and /components route in apps/web to visualize elements; added Toaster + toast store (zustand/nanoid) and global ApiProvider using @ts-rest/react-query with error interception and 401 logout.
- Added export:ui script writing ui_code.txt at repo root; eslint ignores export script.
- Consolidated ComponentGallery/StyleGuide into a single demo view under apps/web/src/features/demo with a /features/demo route to keep showcase code isolated from the main app.
- Refined elements CSS with polished tokens, light/dark theme via prefers-color-scheme, and variable-driven tones for badges/alerts/progress/switch to improve consistency.
- Increased dark-mode text contrast for better readability across all elements.
- Portaled dialog overlay/content to body, wrapped dialogs in FocusTrap for a11y, simplified cn helper, and added polymorphic Text/Heading typing for better DX.
- Applied UI theme variables globally in web entry by importing elements.css and aligning base body styles to theme colors; cleaned legacy index.css styling.

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

- Fixed lint and type-check issues in history navigation, UI elements, and tooling scripts (types, cleanup returns, and safe value handling).

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

- Updated TODO to include demo docs display requirement for `/features/demo`.
- Tests: `pnpm format`, `pnpm lint`, `pnpm type-check` (pass); `pnpm test` fails in `apps/web` (no test files found).

2025-12-30 (Session 20)

- Added collapsed panel styling/animation support and separator drag callbacks for `ResizablePanel`.
- Updated ResizablePanel docs and tests to cover collapsed behavior and new props.
- Tests: `pnpm build` failed at `pnpm lint` due to pre-existing `@typescript-eslint/no-confusing-void-expression` errors in `apps/web/src/features/demo/DemoShell.tsx`.

2025-12-30 (Session 21)

- Moved layout toggles into the demo sidebar and switched demo panels to use collapsed animations.
- Reworked demo layout nesting so right and bottom panels are resizable and bottom bar is visible.
- Added DemoShell layout toggle tests.
- Tests: `pnpm build` failed at `@abe-stack/web:test` due to a DemoShell test error after applying collapsed border styles (jsdom `border-width` on string); pending re-run after fix.

2025-12-30 (Session 22)

- Added `invertResize` support to `ResizablePanel` and applied it to right/bottom demo panels to fix reversed drag direction.
- Introduced `--ui-layout-border` theme token and switched demo layout borders to use it for consistent theming.
- Updated ResizablePanel docs/tests for the new resize behavior.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 23)

- Added `--ui-layout-border` token to the theme generator so layout borders render consistently after theme builds.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 24)

- Switched demo layout min/max sizing to percentage values for all panels.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 25)

- Reduced left panel default and max percentages to prevent it from crowding main/right panels.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 26)

- Expanded documentation panel min/max percentages to 5–100.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 27)

- Tightened ScrollArea scrollbar width and hide behavior; Firefox now hides via transparent color when idle.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 28)

- Switched the demo center panel to use `ScrollArea` so the custom scrollbar appears there.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 29)

- Wrapped the web app routes in `ScrollArea` to apply the custom scrollbar globally.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 30)

- Updated `ScrollArea` to only show on scrollbar hover/scroll with a 2s fade-out delay and removed hover-on-container behavior.
- Hid WebKit scrollbar buttons and refreshed the ScrollArea hover tests.
- Updated ScrollArea docs to reflect the new default hide delay and hover behavior.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 31)

- Slowed ScrollArea scrollbar thumb opacity transition for visible fade-in/fade-out.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 32)

- Removed standard scrollbar styling from `ScrollArea` to prevent native arrow buttons in Chromium.
- Updated WebKit scrollbar styling to fully hide buttons and keep the track transparent.
- Documented the WebKit/Firefox behavior split for ScrollArea.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 33)

- Switched ScrollArea WebKit styling to the inset box-shadow technique for reliable fade-in/out on the thumb.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 34)

- Adjusted ScrollArea box-shadow styling to avoid zero-width thumbs when using overlay scrollbars.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 35)

- Reworked ScrollArea WebKit scrollbar styling to use currentColor + inset shadow for reliable fade-in/out without hiding the thumb.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 36)

- Reverted ScrollArea scrollbar styling to the inset box-shadow approach after the currentColor variant hid the thumb.
- Added a fallback for layout borders in the demo to ensure top/bottom/left/right borders render.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 37)

- Removed underline styling from the demo panel close buttons and nudged them toward the top-right.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 38)

- Moved demo left/right panel borders to the inner containers to keep them visible regardless of panel styling.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 39)

- Updated toast text color to use `--ui-color-text` in dark mode for better contrast.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 40)

- Added success/danger text tones and switched tooltip text to `--ui-color-text` in dark mode.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 41)

- Made slider demo variants uncontrolled so they can be adjusted.
- Added a slider test for uncontrolled value updates.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 42)

- Removed underline on the demo clipboard button hover state.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 43)

- Matched Select option typography to the trigger and swapped to a chevron toggle icon.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 44)

- Swapped demo layout backgrounds/borders to theme tokens for dark mode.
- Removed AppShell from the demo gallery registry.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 45)

- Set pagination button text color to the theme text token.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 46)

- Switched Dialog demo trigger to a styled trigger button to avoid default browser button styling in dark mode.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 47)

- Made Switch demo variants uncontrolled so they can toggle.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 48)

- Added pointer cursor styling for slider inputs.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 49)

- Added a back button in the demo header that navigates to the home route.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 50)

- Added a theme token for border width and wired layout borders to it for consistent layout lines.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 51)

- Set AuthLayout card background to the theme surface color.
- Tests: `pnpm build` (pass).

2025-12-30 (Session 52)

- Normalized demo documentation lookups to match docs by component name or id.
- Tests: `pnpm build` (pass).

2026-01-01 (Session 1)

- **Testing Framework & Library Setup:**
  - Installed modern React testing stack:
    - `@testing-library/user-event@14.6.1` - Realistic user interaction simulation
    - `msw@2.12.7` - Network request mocking at the network level
    - `vitest-axe@0.1.0` - Automated accessibility testing
  - Created MSW configuration structure in `packages/ui/src/test/mocks/`:
    - `handlers.ts` - Template for mock API request handlers (properly typed with `RequestHandler[]`)
    - `server.ts` - MSW server setup with handler integration
  - Enhanced test setup file (`packages/ui/src/test/setup.ts`):
    - Added MSW server lifecycle hooks (beforeAll, afterEach, afterAll)
    - Configured MSW to warn about unhandled requests
    - Exported `axe` from vitest-axe for accessibility testing
    - Added comprehensive inline documentation
  - Created testing documentation:
    - `docs/dev/testing/setup.md` (350+ lines) - Complete setup and configuration guide with:
      - Installation instructions for all testing libraries
      - Configuration examples for Vitest, MSW, and vitest-axe
      - Usage examples for component tests, user interactions, network mocking, and a11y testing
      - Best practices (test behavior not implementation, proper query priorities, async testing)
      - Troubleshooting guide
    - Updated `docs/dev/testing/index.md` to reference new setup guide in modules list
    - Created `docs/log/testing-setup-complete.md` - Summary of testing infrastructure
  - Testing stack now complete with:
    - Vitest (test runner) + RTL (component testing)
    - @testing-library/user-event (realistic interactions)
    - MSW (network mocking)
    - Playwright (E2E testing)
    - vitest-axe (accessibility testing)
  - Tests: All 168 tests in packages/ui passing ✅
  - Tests: `pnpm build` (pass) - format, lint, type-check, test all passing ✅

2026-01-01 (Session 2)

- **TDD Enhancement: Element Component Tests**
  - Created comprehensive test audit (`docs/dev/testing/element-test-audit.md`):
    - Audited all 33 element components for test coverage
    - Identified 12 components with missing tests (36%)
    - Identified 15 components using outdated `fireEvent` (71% of tested)
    - Created detailed enhancement plan prioritizing interactive components
    - Established success criteria: 100% userEvent, 100% accessibility tests, 80%+ coverage
  - **Enhanced Switch.test.tsx** (1 → 24 tests):
    - Replaced `fireEvent` with `userEvent` throughout
    - Added comprehensive edge case coverage:
      - Missing/invalid props (null onChange, undefined values)
      - Boundary conditions (rapid clicking, rapid prop changes)
      - Special characters in className
      - Cleanup on unmount
    - Added keyboard interaction tests (Tab, Space, Enter, focus maintenance)
    - Added mouse interaction tests (double-click, focus/blur)
    - Added disabled state tests (3 tests)
    - Result: All 24 tests passed ✅ - no bugs found, component already solid
  - **Enhanced Accordion.test.tsx** (2 → 33 tests):
    - Replaced `fireEvent` with `userEvent` throughout
    - Added comprehensive edge case coverage:
      - Empty items array, missing id, null title/content
      - Invalid onChange handlers (null, undefined)
      - Boundary conditions (rapid clicking, 100 items, duplicate IDs)
      - Special characters and XSS prevention
      - Cleanup on unmount
    - Added keyboard interaction tests (Tab, Space, Enter, focus/blur, navigation)
    - Added mouse interaction tests (double-click, focus/blur)
    - Added accessibility tests (ARIA attributes, semantic HTML, indicators)
    - Result: All 33 tests passed ✅ - no bugs found, component already solid
    - Noted React warnings for edge cases (missing id, duplicate IDs) but no crashes
  - **Enhanced Checkbox.test.tsx** (2 → 39 tests):
    - Replaced `fireEvent` with `userEvent` throughout
    - Added comprehensive edge case coverage:
      - Missing/invalid props (null onChange, undefined values, empty/null/undefined label)
      - Boundary conditions (rapid clicking, rapid prop changes)
      - Special characters in label and className
      - Cleanup on unmount
    - Added keyboard interaction tests (Tab, Space, Enter, focus maintenance)
    - Added mouse interaction tests (double-click, focus/blur, label click)
    - Added disabled state tests (3 tests)
    - Added accessibility tests (role, label association, ARIA attributes, visual indicator sync)
    - Result: 38/39 tests passed initially, 1 test bug found and fixed
    - Test bug: Assumed empty string `""` would render span, but empty string is falsy
    - Component behavior correct, test expectation was wrong
  - **Enhanced Dialog.test.tsx** (5 → 45 tests):
    - Replaced `fireEvent` with `userEvent` throughout
    - Added comprehensive edge case coverage:
      - Missing/invalid props (null onChange, undefined values, no title/description/trigger)
      - closeOnEscape and closeOnOverlayClick prop validation
      - Boundary conditions (rapid clicking, rapid prop changes)
      - Special characters in title, description, className
      - Cleanup on unmount (open and closed states)
    - Added keyboard interaction tests (focus management, Tab navigation, Escape key)
    - Added mouse interaction tests (overlay double-click, content clicks, trigger reuse)
    - Added accessibility tests (aria-modal, aria-labelledby, aria-describedby, semantic dialog role)
    - Added context validation tests (ensures all parts must be used within Dialog.Root)
    - Result: All 45 tests passed ✅ - no bugs found, component already solid
    - Compound component with 6 parts working correctly (Root, Trigger, Overlay, Content, Title, Description)
  - **Test Coverage Progress:**
    - Before session: 168 tests total
    - After enhancements: 279 tests total (+111 tests, +66% increase)
    - Components using userEvent: 4/21 (19%, up from 0%)
    - Components with accessibility checks: 4/21 (19%, up from 0%)
    - Components with edge case coverage: 10/21 (48%, up from 24%)
  - **Updated Documentation:**
    - Updated `docs/dev/testing/element-test-audit.md` with progress tracker
    - Added "Completed Enhancements" section documenting Switch, Accordion, Checkbox, and Dialog results
    - Updated summary metrics to reflect current state
    - Added context note explaining this is a production UI library requiring comprehensive tests
  - Tests: All 279 tests in packages/ui passing ✅
  - Next components in queue: Radio → RadioGroup → Slider → Tabs → Dropdown → Select

2026-01-01 (Session 3)

- **Enhanced tools/dev/export-ui-code.ts**:
  - Added command-line argument parsing for flexible exports
  - New flags:
    - `--include-tests`: Include all `__tests__` directories
    - `--path <path>`: Export specific files or directories (can be used multiple times)
    - `--with-tests`: Auto-include corresponding test files for each exported file
  - Examples:
    - `tsx tools/dev/export-ui-code.ts --include-tests` (exports all UI code with tests)
    - `tsx tools/dev/export-ui-code.ts --path packages/ui/src/elements --include-tests` (specific directory with tests)
    - `tsx tools/dev/export-ui-code.ts --path packages/ui/src/elements/Image.tsx --with-tests` (single file with its test)
  - Added better output formatting (file count, size, line count)

- **TDD Enhancement: Dropdown.test.tsx** (4 → 39 tests):
  - Replaced `fireEvent` with `userEvent` throughout
  - Added aggressive "real-world chaos" testing section
  - Added comprehensive edge case coverage:
    - Missing/invalid props (null onChange, undefined values, empty/null children)
    - Placement prop testing (bottom, right)
    - Boundary conditions (rapid clicking, rapid prop changes, multiple close() calls)
    - Cleanup on unmount and event listener removal
    - Special characters in trigger text
  - Added keyboard navigation tests (Enter, Space, Escape, ArrowDown, ArrowUp, Tab)
  - Added edge cases: ArrowDown on empty menu, no focusable items, nested DOM structure
  - Added mouse interaction tests (double-click, multiple clicks)
  - Added accessibility tests (aria-haspopup, aria-expanded, role="menu", focusable items)
  - Result: All 39 tests passed ✅ - no component bugs found
  - Found 2 test bugs (async state update handling) - fixed with `waitFor()`

- **TDD Enhancement: Image.test.tsx** (6 → 47 tests) - **FOUND REAL COMPONENT BUG!**:
  - Replaced `fireEvent` with `userEvent` throughout
  - Created helper functions `triggerLoad()` and `triggerError()` wrapped in `act()`
  - Added comprehensive edge case coverage:
    - Happy path: src/alt, lazy/eager loading, loading states, load/error callbacks, aspectRatio, objectFit
    - Missing/invalid props (null/undefined fallback, empty src, long URLs, null callbacks)
    - aspectRatio values (numeric, with spaces, square, unusual ratios)
    - Loading state transitions (src change after load, load after error, rapid src changes)
    - Cleanup on unmount (while loading, after load, after error)
    - Special characters (alt text, src with query params/hash/encoding, className)
    - Accessibility (alt attribute, empty alt for decorative images, semantic structure, ARIA)
    - Real-world chaos (spam load events, spam error events, alternating load/error, data URIs, blob URLs)
  - **BUG FOUND**: Image component didn't reset `isLoading` and `hasError` state when `src` prop changed
  - **FIX**: Added `useEffect(() => { setIsLoading(true); setHasError(false); }, [src])` (Image.tsx:64-68)
  - **Impact**: Without this fix, changing image src wouldn't show loading fallback or clear error state - production bug!
  - Result: 41/47 tests passed initially → All 47 tests passing after fixes ✅
  - Found 3 test bugs (React act() warnings, empty src normalization, style assertion method)
  - This demonstrates **real TDD value**: Found and fixed production bug that would affect real users

- **Test Coverage Progress:**
  - Before session: 279 tests total
  - After enhancements: 365 tests total (+86 tests, +31% increase)
  - Components using userEvent: 6/21 (29%, up from 19%)
  - Components with accessibility checks: 6/21 (29%, up from 19%)
  - Components with edge case coverage: 12/21 (57%, up from 48%)
  - **MAJOR MILESTONE**: Found first real component bug through TDD! 🎯

- **Updated Documentation:**
  - Updated `docs/dev/testing/element-test-audit.md` with Dropdown and Image results
  - Added detailed bug findings for Image component
  - Updated summary metrics and total progress tracker
  - Documented that Image bug demonstrates TDD value for production-ready UI library

- Tests: All 365 tests in packages/ui passing ✅
- Next components in queue: Radio → RadioGroup → Slider → Tabs → Select

2026-01-01 (Session 4)

- **TDD Enhancement: Modal.test.tsx** (4 → 51 tests):
  - Replaced `fireEvent` with `userEvent` throughout
  - Added comprehensive edge case coverage:
    - Happy path: all 7 compound parts (Root, Title, Description, Header, Body, Footer, Close)
    - Missing/invalid props (null/undefined onClose, missing Title/Description, null children)
    - Boundary conditions (rapid overlay clicks, rapid Escape presses, rapid prop changes, multiple onClose calls)
    - Cleanup on unmount (when open, when closed, event listener removal)
    - Special characters (Title, Description, Body, Close button text)
  - Added keyboard interaction tests (Escape key behavior, preventDefault, other keys don't close)
  - Added mouse interaction tests (overlay double-click, content clicks, Close button with Enter/Space)
  - Added accessibility tests (aria-modal, aria-labelledby, aria-describedby, semantic dialog role, focus management, custom ARIA)
  - Added context validation tests (Title, Description, Close must be within Root; Header/Body/Footer don't require context)
  - Added portal rendering tests (modal and overlay render to document.body)
  - Added real-world chaos tests (rapid open/close, alternating callbacks, dynamic content, nested elements, multiple Titles, dynamic Title/Description mounting)
  - Result: 50/51 tests passed initially → All 51 tests passing after 1 test bug fix ✅
  - No component bugs found - Modal component is solid
  - Test bug: Used wrong query for button with aria-label (should use accessible name, not text content)

- **TDD Enhancement: Overlay.test.tsx** (1 → 35 tests):
  - Replaced `fireEvent` with `userEvent` throughout
  - Added comprehensive edge case coverage:
    - Happy path: renders when open, click handling with userEvent, toggle visibility, forwards className/style/ref
    - Missing/invalid props (null/undefined onClick, missing/empty className, missing style)
    - Boundary conditions (rapid clicks 10x, rapid prop changes 20x, rapid callback changes, multiple overlays simultaneously)
    - Cleanup on unmount (when open, when closed, remove from DOM when toggled closed)
    - Special characters (special chars in className, className with spaces)
  - Added mouse interaction tests (double-click, click without handler, multiple clicks with different callbacks)
  - Added portal rendering tests (renders to document.body, not in component tree)
  - Added prop forwarding tests (data attributes, aria attributes, custom props)
  - Added real-world chaos tests (rapid open/close 50x, className/style changes during open, alternating onClick handlers, rapid mount/unmount 20x, clicks during prop transitions)
  - Result: All 35 tests passed immediately ✅
  - No component bugs found - Overlay component is solid

- **TDD Enhancement: Pagination.test.tsx** (2 → 39 tests):
  - Replaced `fireEvent` with `userEvent` throughout
  - Added comprehensive edge case coverage:
    - Happy path: renders pages, navigation (next/prev/direct), active state, disabled states
    - Missing/invalid props (null onChange, 0 pages, 1 page, defaultValue beyond totalPages/0/negative)
    - Boundary conditions (rapid clicks, clicking disabled buttons, clicking same page, 50 pages, alternating callbacks)
    - Keyboard interactions (Enter/Space on buttons, Tab navigation through all buttons)
    - Mouse interactions (double-click on page/next buttons)
    - Controlled vs uncontrolled mode (defaultValue, value prop changes)
    - Real-world chaos (rapid page changes, mount/unmount, totalPages changing)
    - Accessibility (button roles, disabled states, data-active attribute)
  - Result: 35/39 tests passed initially → All 39 tests passing after 4 test bug fixes ✅
  - No component bugs found - Pagination component is solid
  - Test bugs: 4 defaultValue assumption errors (component doesn't validate/clamp by design)

- **TDD Enhancement: Popover.test.tsx** (2 → 45 tests):
  - Replaced `fireEvent` with `userEvent` throughout
  - Added comprehensive edge case coverage:
    - Happy path: renders trigger, opens/closes on click, Escape closes, aria-expanded updates, defaultOpen, placement options
    - Missing/invalid props (null/undefined trigger/children/onChange)
    - Boundary conditions (rapid toggles, rapid Escape presses, multiple popovers, alternating callbacks)
    - Keyboard interactions (Enter/Space to toggle, Escape to close, other keys don't close, Tab navigation)
    - Mouse interactions (double-click, triple-click, content clicks don't interfere)
    - Controlled vs uncontrolled mode (defaultOpen, open prop changes)
    - Focus management (maintains trigger focus, restores focus on Escape)
    - Event listener cleanup (Escape listener cleanup on unmount/close)
    - Real-world chaos (rapid open/close cycles, mount/unmount, trigger/placement/content changes)
    - Accessibility (button role, aria-expanded, keyboard accessible)
  - Result: All 45 tests passed immediately ✅
  - No component bugs found - Popover component is solid

- **Test Coverage Progress:**
  - Before session: 375 tests total
  - After Modal enhancement: 421 tests total (+46 tests)
  - After Overlay enhancement: 456 tests total (+34 tests)
  - After Pagination enhancement: 495 tests total (+37 tests)
  - After Popover enhancement: 536 tests total (+43 tests, +43% increase from session start)
  - Components using userEvent: 10/21 (48%, up from 29%)
  - Components with accessibility checks: 9/21 (43%, up from 29%)
  - Components with edge case coverage: 16/21 (76%, up from 57%)

- **Updated Documentation:**
  - Updated `docs/dev/testing/element-test-audit.md` with all 4 component results
  - Added Pagination and Popover findings to Key Learnings section
  - Updated summary metrics and total progress tracker

- Tests: All 536 tests in packages/ui passing ✅
- Next components in queue: Radio → RadioGroup → Slider → Tabs → Select

2026-01-01 (Session 5)

- **TDD Enhancement: Radio.test.tsx** (2 → 39 tests):
  - Replaced `fireEvent` with `userEvent` throughout.
  - Added comprehensive edge case coverage:
    - Happy path: renders with label, checked/unchecked states, visual indicator sync.
    - Missing/invalid props (null/undefined label/onChange).
    - Boundary conditions (rapid clicks, clicking already checked radio, alternating callbacks).
    - Keyboard interactions (Space key selection, focus maintenance).
    - Mouse interactions (double-click, label click).
    - Controlled vs uncontrolled mode (defaultChecked, checked prop changes).
    - Real-world chaos (rapid mount/unmount, label/className changes while mounted).
    - Accessibility (radio role, label association, visual indicator hidden from screen readers).
  - **Refined Radio Behavior:** Aligned with standard radio behavior where `onChange` only fires when the checked state changes (subsequent clicks on a checked radio do nothing).
  - Result: All 39 tests passing after test refinements ✅.

- **TDD Enhancement: RadioGroup.test.tsx** (3 → 35 tests):
  - Replaced `fireEvent` with `userEvent` throughout.
  - Added aggressive "real-world chaos" and control testing section.
  - Added comprehensive edge case coverage:
    - Happy path: renders radiogroup with children, aria-label/labelledby propagation.
    - Keyboard navigation (Arrow keys, Home/End, wrapping, skipping disabled items).
    - Missing/invalid props (no aria label, empty children, className forwarding).
    - Boundary conditions (rapid key presses, alternating keys).
    - Controlled mode via `value` prop and `onValueChange` callback.
    - Context propagation (name/value shared with children without prop drilling).
  - Result: All 35 tests passing after fixes ✅.

- **Radio & RadioGroup Implementation Refactoring:**
  - **Implemented `RadioGroupContext`**: Now provides `name`, `value`, and `onValueChange` to all nested `Radio` components.
  - **Updated `Radio` Component**: Modified to consume `RadioGroupContext`. It now automatically matches its checked state based on the group's value and inherits the group's `name` if not provided.
  - **Fixed Accessibility Bug**: Removed duplicate `role="radio"` from the decorative visual indicator in the `Radio` component and marked it as `aria-hidden="true"`.
  - **Improved Keyboard Navigation**: Logic now correctly skips disabled radio buttons during arrow key navigation within a group.

- **Test Coverage Progress:**
  - Before session: 536 tests total
  - After enhancements: 610 tests total (+74 tests, +14% increase)
  - Components using userEvent: 12/21 (57%, up from 48%)
  - Components with accessibility checks: 11/21 (52%, up from 43%)
  - Components with edge case coverage: 18/21 (86%, up from 76%)

- **Updated Documentation:**
  - Updated `docs/dev/testing/element-test-audit.md` with Radio and RadioGroup results.
  - Documented context propagation and improved keyboard navigation logic.

- Tests: All 610 tests in packages/ui passing (excluding unrelated pre-existing failure in Progress.test.tsx) ✅
- Next components in queue: Slider → Select → Tabs → Tooltip

2026-01-01 (Session 6)

- **TDD Enhancement: Select.test.tsx** (2 → 20 tests):
  - Replaced `fireEvent` with `userEvent` throughout.
  - Added comprehensive edge case coverage:
    - Happy path: renders trigger, opens menu, displays options, changes selection on click.
    - Keyboard navigation: ArrowDown/Up (skip disabled), Enter/Space to select, Escape to close/restore focus, Home/End navigation.
    - Edge cases: empty children, non-option children, implicit values (from children), disabled trigger.
    - Controlled vs uncontrolled mode (defaultValue, value/onChange synchronization).
    - Accessibility: aria-haspopup, aria-expanded, listbox/option roles, aria-selected, aria-activedescendant.
  - Result: All 20 tests passing after component refactoring ✅.

- **Select Component Refactoring & Robustness:**
  - **Refactored State Management**: Switched to `useControllableState` for robust synchronization between internal and external value props.
  - **Improved Keyboard Navigation**: Implemented logic to skip disabled options when using Arrow keys, Home, or End.
  - **Enhanced Accessibility**:
    - Added `aria-activedescendant` to the trigger button to announce the highlighted option.
    - Added `aria-labelledby` to the listbox for better screen reader context.
    - Added `aria-disabled` to disabled options.
    - Ensured focus is restored to the trigger button when closing the menu (via selection or Escape).
  - **Type Safety**: Updated `SelectProps` to omit `onChange` from the native button props to avoid type conflicts with the custom `onChange: (value: string) => void` handler.

- **Test Coverage Progress:**
  - Before session: 610 tests total
  - After enhancements: 628 tests total (+18 tests, +3% increase)
  - Components using userEvent: 13/21 (62%, up from 57%)
  - Components with accessibility checks: 12/21 (57%, up from 52%)
  - Components with edge case coverage: 19/21 (90%, up from 86%)

- **Updated Documentation:**
  - Updated `docs/dev/testing/element-test-audit.md` with Select results.

- Tests: All 628 tests in packages/ui passing (excluding unrelated pre-existing failure in Progress.test.tsx) ✅
- Next components in queue: Slider → Tabs → Tooltip

2026-01-01 (Session 7)

- Added RTL unit tests for elements: Alert, Avatar, Badge, CardElement, Divider, Heading, InputElement, MenuItem, Skeleton, Text, TextArea, VisuallyHidden.
- Covered defaults, ref/className forwarding, tone/size data attributes, custom elements, and style overrides.
- Tests: All 702 tests in packages/ui passing ✅

2026-01-01 (Session 8)

- Added aggressive layout tests for Container, PageContainer, SidebarLayout, StackedLayout, AuthLayout.
- Hardened AppShell, TopbarLayout, and BottombarLayout tests with additional forwarding and edge coverage.
- Tests: All 724 tests in packages/ui passing ✅

2026-01-01 (Session 9)

- Fixed Slider keydown handler typing to satisfy lint.
- Adjusted Badge test to avoid invalid anchor props and reran full build.
- Build: `pnpm build` passing ✅

2026-01-01 (Session 10)

- Cleaned Accordion duplicate key warnings by disambiguating DOM ids/keys while preserving controlled ids.
- Build: `pnpm build` passing ✅

2026-01-01 (Session 11)

- Consolidated component styles into `components.css`, replacing `Button.css` and aligning component imports.
- Updated component style imports for Badge, Card, Spinner, and Layout to use the consolidated stylesheet.

2026-01-01 (Session 12)

- Moved layout class styles into `layouts.css` and removed layout rules from `elements.css`.
- Replaced layout inline styles with layout-specific classes and CSS variables where needed.
- Updated layout tests for class-based styling expectations.

2026-01-01 (Session 13)

- Centralized component layout styles (Box, Input, Layout, Spinner) in `components.css` and shifted remaining inline styles to CSS variables.
- Ensured all components import `components.css`, leaving elements/layouts styles in their respective consolidated stylesheets.
- Documented shared component/layout styles in `packages/ui/docs/README.md`.

2026-01-01 (Session 14)

- Added aggressive component tests for Badge, Box, Button, Card, Layout, and Spinner with edge case coverage.
- Expanded Input and FocusTrap tests for aria wiring, custom elements, and focus edge cases.
- Build: `pnpm build` passing ✅

2026-01-01 (Session 15)

- Expanded hooks test coverage with edge cases across click outside, debounce, media query, on-screen, window size, disclosure, and local storage.
- Hardened clipboard hook to clear timeouts between copies and added error-path tests.

2026-01-01 (Session 16)

- Added unit tests for UI theme tokens (colors, spacing, motion, typography) and re-export validation.
- Added tests for MSW handlers/server wiring and test setup lifecycle callbacks.
- Expanded utils coverage to include cn edge cases and index re-export checks.
- Removed index re-export tests for theme and utils at user request.

2026-01-01 (Session 17)

- Relocated UI stylesheets into `packages/ui/src/styles` and updated component/layout/element imports.
- Switched shared element styles to `elements.css` naming and updated build-theme output path.

2026-01-02 (Session 18)

- Enhanced DemoShell bottom bar with version info (v1.1.0), environment badge (DEV/PROD), and component count.
- Added keyboard shortcuts display in bottom bar: L (toggle left panel), R (toggle right panel), T (cycle theme), Esc (deselect component).
- Implemented keyboard shortcuts handler with proper event delegation (skips input/textarea fields).
- Fixed panel size persistence: added controlled mode (`size` prop) to ResizablePanel so localStorage-saved sizes are applied on page load.
- Added `getTotalComponentCount()` utility to registry for component count display.
- Reduced bottom bar size from 15% to 8% for a more compact status bar layout.
- Updated DemoShell tests for new bottom bar content, keyboard shortcuts, and panel size expectations.
- Fixed lint errors in test setup (matchMedia mock return types) and ApiProvider tests (non-null assertions).
- Build: `pnpm build` passing ✅

2026-01-02 (Session 19)

- **Component Extraction from apps/web to packages/ui:**
  - Extracted `Kbd` component for keyboard key display with size variants (sm/md).
  - Extracted `FormField` component with label, error message, helper text, and required indicator support.
  - Extracted `LoadingContainer` component combining Spinner and Text for loading states.
  - Extracted `EnvironmentBadge` component for environment status display (development/production/staging/test).
  - Extracted `VersionBadge` component for version display with optional prefix.
- **New Hooks:**
  - `useKeyboardShortcuts` - Global keyboard shortcuts with modifier key support (ctrl/shift/alt), input field exclusion, and cleanup.
  - `useThemeMode` - Theme mode management (system/light/dark) with localStorage persistence, cycleMode helper, and resolved theme state.
  - `usePanelConfig` - Panel configuration management for resizable layouts with localStorage persistence, toggle/resize/reset helpers.
- **CSS Utilities:**
  - Created `utilities.css` with reusable utility classes for flex, gap, padding, margin, typography, borders, and backgrounds.
  - All utilities prefixed with `ui-` and use theme tokens (e.g., `ui-flex-center`, `ui-gap-3`, `ui-p-4`, `ui-text-sm`).
- **Documentation Updates:**
  - Updated CLAUDE.md with iterative testing strategy: run targeted tests during iterations, full build at session end.
  - Added example commands for running specific test files during development iterations.
- **Tests Added:**
  - Kbd: 6 tests (size variants, ref/className forwarding).
  - FormField: 9 tests (label, error, helper text, required indicator, ref forwarding).
  - LoadingContainer: 5 tests (default/custom text, spinner, className, props).
  - useKeyboardShortcuts: 10 tests (key matching, modifiers, input exclusion, cleanup).
- Build: All 578 tests passing ✅
