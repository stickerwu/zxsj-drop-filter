# Inventory Scan Modal Compact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the inventory scan modal header and footer, right-align the manual-add action, and remove unnecessary horizontal dividers.

**Architecture:** Keep the existing `InventoryScanModal` component and HeroUI composition. Add stable test ids to the three layout regions so component tests can verify the structural contract without depending on generated HeroUI internals.

**Tech Stack:** React 19, TypeScript, HeroUI v3, Tailwind CSS v4, Vitest, Testing Library, Tauri 2.

## Global Constraints

- Preserve all scanning and inventory behavior.
- Keep the existing three-column body and theme variables.
- Use Inline Execution only; do not start subagents.
- Release as `v0.5.3` with changelog, commit, dual remote push, and tag.

---

### Task 1: Add The Layout Regression Test

**Files:**
- Modify: `src/features/tiangong/inventory-scan-modal.test.tsx`

**Interfaces:**
- Consumes: `InventoryScanModal`
- Produces: regression assertions for `inventory-scan-header`, `inventory-scan-tabbar`, `inventory-scan-add-item`, and `inventory-scan-footer`

- [ ] **Step 1: Write the failing test**

Add a test that expects:

```tsx
expect(header).toHaveClass("h-[60px]")
expect(header).not.toHaveClass("border-b")
expect(tabbar).toHaveClass("h-[52px]")
expect(addButton).toHaveClass("ml-auto")
expect(tabbar).not.toHaveClass("border-b")
expect(footer).toHaveClass("h-[50px]")
expect(footer).not.toHaveClass("border-t")
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
pnpm exec vitest run src/features/tiangong/inventory-scan-modal.test.tsx
```

Expected: failure because the new test ids and compact classes do not exist.

### Task 2: Implement The Compact Modal Layout

**Files:**
- Modify: `src/features/tiangong/inventory-scan-modal.tsx`

**Interfaces:**
- Consumes: existing HeroUI modal and tabs composition
- Produces: compact header, tab toolbar, and footer layout

- [ ] **Step 1: Add stable layout test ids**

Add `data-testid` values to the header, tabs toolbar, manual-add button, and footer.

- [ ] **Step 2: Apply the approved dimensions and alignment**

Use:

```tsx
h-[60px]
h-[52px]
ml-auto
h-[50px]
```

Remove `border-b` from the header and tabs toolbar and remove `border-t` from the footer.

- [ ] **Step 3: Run the targeted test**

Run:

```powershell
pnpm exec vitest run src/features/tiangong/inventory-scan-modal.test.tsx
```

Expected: all inventory scan modal tests pass.

### Task 3: Version And Release Metadata

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: consistent `0.5.3` release metadata

- [ ] **Step 1: Update all project versions to `0.5.3`**

- [ ] **Step 2: Add the `2026-07-21` changelog entry**

Document the compact header/footer, right-aligned manual-add action, and divider removal.

### Task 4: Verify And Publish

**Files:**
- Verify all modified files

**Interfaces:**
- Produces: tested commit and dual-remote `v0.5.3` tag

- [ ] **Step 1: Run verification**

```powershell
pnpm test
pnpm lint
pnpm build
pnpm release:validate -- v0.5.3
cargo test
cargo check
```

- [ ] **Step 2: Inspect the running Tauri dev modal**

Verify the header, tabs toolbar, footer, and divider removal at the active desktop viewport.

- [ ] **Step 3: Commit and push**

```powershell
git add CHANGELOG.md package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock src/features/tiangong/inventory-scan-modal.tsx src/features/tiangong/inventory-scan-modal.test.tsx docs/superpowers
git commit -m "style: compact inventory scan modal"
git tag -a v0.5.3 -m "v0.5.3"
git push github main
git push github v0.5.3
git push gitee main
git push gitee v0.5.3
```

