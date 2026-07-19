# Reference Fidelity Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the HeroUI desktop workbench and drop editor with the approved reference images while preserving all domain and data behavior.

**Architecture:** Keep the existing component boundaries and Zustand/domain flow. Apply the fidelity pass inside the toolbar, filter, result table, detail, and editor components, with shared CSS contracts for table readability and stable slot-to-icon mapping for detail rows.

**Tech Stack:** Tauri 2, React 19, TypeScript 6, HeroUI v3, Tailwind CSS v4, Zustand, react-resizable-panels, Vitest, Testing Library.

## Global Constraints

- Do not modify `.zx`, matching, recommendation, default data, dungeon names, slots, or attributes.
- Keep `light`, `dark`, and `system` themes.
- Preserve 1440×900 primary and 1180×720 minimum window layouts.
- Keep the editor fixed at 720px with a viewport maximum.
- Only the current Select option may display a check mark.
- Use 13px result table body text and clear 12px headers.

---

### Task 1: Match the toolbar and filter sidebar

**Files:**
- Modify: `src/components/app/app-toolbar.tsx`
- Modify: `src/components/app/filter-sidebar.tsx`
- Modify: `src/components/app/app-controls.test.tsx`

**Interfaces:**
- Consumes: existing `useAppStore`, serialization functions, and `ThemeMenu`.
- Produces: unchanged `<AppToolbar onOpenEditor />` and `<FilterSidebar />` APIs.

- [ ] **Step 1: Add failing visual contract assertions**

Add assertions that a selected attribute has `data-selected="true"` and the first dungeon control has `data-layout="full-row"`.

- [ ] **Step 2: Run the focused test**

Run:

```powershell
pnpm test -- src/components/app/app-controls.test.tsx
```

Expected: FAIL because the visual state attributes do not exist.

- [ ] **Step 3: Implement reference-aligned controls**

Add stable `data-selected` and `data-layout` attributes, 34px controls, teal selected backgrounds, light neutral unselected backgrounds, and full-width left-aligned dungeon rows. Increase toolbar height to 72px and add restrained semantic icon colors.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm test -- src/components/app/app-controls.test.tsx
pnpm lint
pnpm build
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/app/app-toolbar.tsx src/components/app/filter-sidebar.tsx src/components/app/app-controls.test.tsx
git commit -m "style: align toolbar and filters with reference"
```

### Task 2: Increase result table readability

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/results/recommendation-table.tsx`
- Modify: `src/components/results/dungeon-detail-table.tsx`
- Modify: `src/components/results/hit-item-table.tsx`
- Modify: `src/components/results/results-tabs.tsx`
- Modify: `src/components/results/results-tabs.test.tsx`

**Interfaces:**
- Consumes and produces the existing `ResultsTabs` API.

- [ ] **Step 1: Add failing table contract assertions**

Assert that the recommendation table has `data-density="reference"` and that its header columns use `data-readable-header="true"`.

- [ ] **Step 2: Run the test**

```powershell
pnpm test -- src/components/results/results-tabs.test.tsx
```

Expected: FAIL before the attributes are implemented.

- [ ] **Step 3: Implement table and Tab styling**

Use explicit opaque table header backgrounds, 12px semibold headers, 13px cells, 46px rows, teal selected rows, 48px Tabs, and visible secondary text in both themes.

- [ ] **Step 4: Verify**

```powershell
pnpm test -- src/components/results/results-tabs.test.tsx
pnpm lint
pnpm build
```

- [ ] **Step 5: Commit**

```powershell
git add src/index.css src/components/results
git commit -m "style: improve result table readability"
```

### Task 3: Enrich the recommendation detail panel

**Files:**
- Modify: `src/components/app/detail-panel.tsx`
- Modify: `src/components/app/detail-panel.test.tsx`

**Interfaces:**
- Consumes: `Recommendation | undefined`.
- Produces: unchanged `<DetailPanel recommendation />`.

- [ ] **Step 1: Add a failing stable slot icon test**

Render a recommendation and assert that an entry has `data-slot-visual` equal to its normalized equipment slot.

- [ ] **Step 2: Run the test**

```powershell
pnpm test -- src/components/app/detail-panel.test.tsx
```

Expected: FAIL because stable slot visuals are not exposed.

- [ ] **Step 3: Implement slot visual mapping**

Map all 14 slots to fixed Lucide icons and colors, add icons to both metric blocks, tighten entry cards, and improve heading hierarchy.

- [ ] **Step 4: Verify**

```powershell
pnpm test -- src/components/app/detail-panel.test.tsx
pnpm lint
pnpm build
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/app/detail-panel.tsx src/components/app/detail-panel.test.tsx
git commit -m "style: enrich recommendation detail panel"
```

### Task 4: Match the editor spacing and hierarchy

**Files:**
- Modify: `src/components/editor/drop-editor-modal.tsx`
- Modify: `src/components/editor/drop-editor-modal.test.tsx`

**Interfaces:**
- Consumes and produces the existing `DropEditorModal` API.

- [ ] **Step 1: Add failing editor layout assertions**

Assert that the dialog has `data-editor-layout="reference"`, the first row has `data-row-density="compact"`, and only one open option contains a custom check.

- [ ] **Step 2: Run the test**

```powershell
pnpm test -- src/components/editor/drop-editor-modal.test.tsx
```

Expected: FAIL for the new layout attributes.

- [ ] **Step 3: Implement the reference editor**

Add the title icon, 72px header/footer, divider-based left column, 40px left controls, 38px row controls, 46px rows, teal verification controls, red-soft delete controls, and remove the extra right-side column header bar.

- [ ] **Step 4: Verify**

```powershell
pnpm test -- src/components/editor/drop-editor-modal.test.tsx
pnpm lint
pnpm build
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/editor/drop-editor-modal.tsx src/components/editor/drop-editor-modal.test.tsx
git commit -m "style: align drop editor with reference"
```

### Task 5: Visual QA and release completion

**Files:**
- Modify only if QA finds a specific defect.

- [ ] **Step 1: Run full verification**

```powershell
pnpm test
pnpm lint
pnpm build
git diff --check
```

- [ ] **Step 2: Inspect required states**

At 1440×900 and 1180×720 inspect light/dark themes, all Tabs, selected/unselected filters, full-row dungeons, readable table headers, slot-specific detail icons, editor spacing, Select checks, invalid weights, and fixed footer.

- [ ] **Step 3: Build NSIS**

```powershell
$env:Path = 'C:\Users\98521\.cargo\bin;C:\Users\98521\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin;' + $env:Path
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:HTTPS_PROXY='http://127.0.0.1:10808'
$env:ALL_PROXY='http://127.0.0.1:10808'
pnpm tauri build --bundles nsis
```

- [ ] **Step 4: Commit, tag, and push**

Commit release metadata, tag `v0.2.0`, then push `main` and the tag to `github` and `gitee`.
