# BSLT Testing Strategy & Restoration Plan

## Objective

Restore development velocity by using `test/` as a "staging area" and selectively extracting only meaningful tests that match the new Specs.

## Phase 1: The Great Staging (Completed)

**Goal:** Park all existing tests to clear the "Fast Loop".

- [x] **1. Setup Staging Area**
  - [x] All existing tests moved to `test/`.
  - [x] `vitest.config.ts` configured to ignore `test/`.

## Phase 2: Spec-Generation & Analysis (Source of Truth)

**Goal:** Use existing code to define the "True Behavior" and filter out noise.

- [ ] **1. Extract "Source of Truth"**
  - [ ] Select critical Pilot Module (e.g., Toggle Logic, Auth, or Billing).
- [ ] **2. Agent Task - "Reverse-Spec"**
  - [ ] Prompt: "Generate a SPECS.md based strictly on what this code actually does. Document inputs, outputs, edge cases, and side effects."
  - [ ] Deliverable: `docs/specs/[module]-current.md`.

- [ ] **3. Expert Review & Filtering**
  - [ ] Compare `[module]-current.md` against Enterprise Standards.
  - [ ] Define `docs/specs/[module]-v1.md` ( The Target State).
  - [ ] **Critical Decision:** Only tests that validate this Spec will be extracted. Redundant/Flaky tests remain in `test/archive`.

## Phase 3: Selective Extraction (The Restoration)

**Goal:** Restore only the "Gold Standard" tests to `main/`.

- [ ] **1. Match & Extract**
  - [ ] Identify tests in `test/` that match the new Spec.
  - [ ] Move ONLY these tests back to `main/[path]/[file].test.ts`.
- [ ] **2. The "Fast Loop" Validation**
  - [ ] Verify extracted unit tests run in < 50ms.
  - [ ] Ensure no integration/slow tests leaked back into `main/`.

## Phase 4: Code Implementation (The Fix)

**Goal:** Refactor code to pass the strict v1.0.0 Specs.

- [ ] **1. Execute Implementation Changes**
  - [ ] Update source code to satisfy the extracted "Gold Standard" tests.
  - [ ] Ensure strict types are respected.
