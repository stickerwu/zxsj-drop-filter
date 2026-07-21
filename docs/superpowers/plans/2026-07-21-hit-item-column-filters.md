# Hit Item Column Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local Treasure and Slot multi-select filters to the Hit Items table headers.

**Architecture:** Keep filter state inside `HitItemTable`. Extract a small header dropdown component in the same file, derive options from unfiltered rows, and derive visible rows with AND filtering before rendering the HeroUI table body.

**Tech Stack:** React 19, TypeScript, HeroUI v3 Dropdown, Lucide icons, Vitest, Testing Library, Tauri 2.

## Global Constraints

- Only the Hit Items table is filtered.
- Do not change the Zustand global filter state.
- Use HeroUI components and existing theme variables.
- Use Inline Execution only.
- Release as `v0.5.4`.

---

### Task 1: Add Failing Interaction Tests

**Files:**
- Modify: `src/components/results/results-tabs.test.tsx`

**Interfaces:**
- Consumes: `HitItemTable`
- Produces: regression coverage for Treasure and Slot column filters

- [ ] Add a test that opens the Treasure filter, selects one treasure, and verifies rows for another treasure disappear.
- [ ] Add a test that combines Treasure and Slot selections and verifies only rows satisfying both remain.
- [ ] Add a test that clears a filter and restores the rows.
- [ ] Run `pnpm exec vitest run src/components/results/results-tabs.test.tsx` and verify the tests fail because filter controls do not exist.

### Task 2: Implement Header Filter Dropdowns

**Files:**
- Modify: `src/components/results/hit-item-table.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces: buttons named `筛选宝鉴` and `筛选部位`
- Produces: locally filtered table rows and active filter styling

- [ ] Add local selected Treasure and Slot sets.
- [ ] Derive sorted unique filter options from all hit rows.
- [ ] Add HeroUI multi-select dropdowns to the two table headers.
- [ ] Filter rows with Treasure AND Slot conditions.
- [ ] Preserve row-to-recommendation selection for visible rows.
- [ ] Render the local-filter empty state when appropriate.
- [ ] Run the targeted tests and verify they pass.

### Task 3: Version And Release

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `CHANGELOG.md`

- [ ] Update all versions to `0.5.4`.
- [ ] Add the `2026-07-21` changelog entry.
- [ ] Run frontend tests, lint, build, Cargo tests/check, and release validation.
- [ ] Visually verify the two header dropdowns at `1440x900`.
- [ ] Build the NSIS installer.
- [ ] Commit, tag, push GitHub/Gitee, and verify the release workflow.

