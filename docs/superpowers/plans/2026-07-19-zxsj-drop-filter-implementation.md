# 诛仙世界秘境掉落筛选 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a maintainable Tauri desktop replacement for the existing dungeon-drop filter.

**Architecture:** React/TypeScript/Vite renders the shadcn/ui three-column workbench. A pure TypeScript domain package owns normalized data, matching, weighted probability, sorting, summaries, JSON validation, and the `zx1` compatibility boundary. Tauri owns native windows, dialog/file access, clipboard, and packaging.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Table, Zod, Vitest, Playwright, pnpm.

## Global Constraints

- Default UI is the confirmed “青玉纸本” light theme.
- Default layout is 20% / 50% / 30% resizable three-column workbench.
- Empty attribute/slot/dungeon filters mean no restriction.
- `命中任一` uses set intersection; `同一词条全满足` uses set containment.
- Probability uses exact internal values and display-only rounding.
- Public repository includes demo data only; real `.zx` files are ignored.
- MIT License; sync `main` and tags to GitHub and Gitee.

---

### Task 1: Initialize Repository and Toolchain

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/vite-env.d.ts`
- Create: `.gitignore`
- Create: `LICENSE`
- Modify: `docs/superpowers/specs/2026-07-19-zxsj-drop-filter-design.md`

**Interfaces:**
- Produces the pnpm scripts `dev`, `build`, `test`, `lint`, `tauri:dev`, and `tauri:build`.
- Produces a clean git repository whose first commit contains documentation and toolchain configuration only.

- [ ] **Step 1: Confirm prerequisites**

Run:

```powershell
node --version
pnpm --version
cargo --version
rustc --version
```

Expected: Node 20+, pnpm 10+, and Rust/Cargo available. If Rust is missing, install rustup with the official installer before scaffolding, then restart the terminal and rerun the commands.

- [ ] **Step 2: Scaffold the frontend**

Run:

```powershell
pnpm create vite . --template react-ts
pnpm install
pnpm add zustand @tanstack/react-table zod lucide-react clsx tailwind-merge
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint prettier
```

Expected: `package.json`, Vite entrypoints, and a lockfile exist.

- [ ] **Step 3: Add Tauri**

Run:

```powershell
pnpm add @tauri-apps/api
pnpm add -D @tauri-apps/cli
pnpm tauri init
pnpm tauri add dialog
pnpm tauri add fs
pnpm tauri add clipboard-manager
```

Configure the application identifier as `com.stickerwu.zxsjdropfilter`, product name as `诛仙世界秘境掉落筛选`, and development URL as the Vite server URL.

- [ ] **Step 4: Add project scripts and test setup**

Add these scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint .",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
}
```

Create `vitest.config.ts` with `environment: "jsdom"` and a setup file importing `@testing-library/jest-dom`.

- [ ] **Step 5: Verify the empty scaffold**

Run:

```powershell
pnpm test
pnpm build
```

Expected: Vitest exits successfully with zero test files allowed, and Vite produces `dist/`.

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-lock.yaml pnpm-workspace.yaml vite.config.ts tsconfig.json src/vite-env.d.ts src/index.css src/main.tsx .gitignore LICENSE src-tauri docs
git commit -m "chore: initialize tauri drop filter workspace"
```

### Task 2: Define Domain Types and Normalization Tests

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/attributes.ts`
- Create: `src/domain/normalize.ts`
- Test: `src/domain/normalize.test.ts`
- Create: `src/data/demo-data.json`

**Interfaces:**

```ts
export type MatchMode = "any" | "all";
export type AttributeName = "会心" | "专精" | "调息" | "元御";

export interface DropEntry {
  id: string;
  slot: string;
  attributeCombo: string;
  expandedAttributes: AttributeName[];
  weight: number;
  verified: boolean;
}

export interface Treasure {
  id: string;
  name: string;
  entries: DropEntry[];
}

export interface Dungeon {
  id: string;
  name: string;
  treasures: Treasure[];
}

export interface DropDataset {
  schemaVersion: 2;
  attributes: AttributeName[];
  slots: string[];
  dungeons: Dungeon[];
}
```

- [ ] **Step 1: Write failing normalization tests**

```ts
import { describe, expect, it } from "vitest";
import { expandAttributeCombo, normalizeDataset } from "./normalize";

describe("attribute normalization", () => {
  it("expands a combined combo into base attributes", () => {
    expect(expandAttributeCombo("会专")).toEqual(["会心", "专精"]);
  });

  it("preserves row identity and fills stable defaults", () => {
    const result = normalizeDataset({
      schemaVersion: 2,
      attributes: ["会心", "专精", "调息", "元御"],
      slots: ["衣服"],
      dungeons: [{ name: "斩恨磨蛰境", treasures: [{ name: "致知", entries: [{ slot: "衣服", attributeCombo: "会专", weight: 1 }] }] }]
    });
    expect(result.dungeons[0].treasures[0].entries[0]).toMatchObject({
      id: expect.any(String),
      expandedAttributes: ["会心", "专精"],
      verified: false
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
pnpm test src/domain/normalize.test.ts
```

Expected: FAIL because the domain functions do not exist.

- [ ] **Step 3: Implement minimal normalization**

Implement combo parsing using the canonical four base attributes and two-character aliases (`会专`, `会调`, `会元`, `专调`, `专元`, `调元`). Unknown text is preserved as an empty expanded set plus a validation warning.

- [ ] **Step 4: Run the test and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/domain src/data/demo-data.json
git commit -m "feat: add normalized drop dataset model"
```

### Task 3: Implement Matching and Probability with TDD

**Files:**
- Create: `src/domain/matching.ts`
- Create: `src/domain/recommendations.ts`
- Test: `src/domain/matching.test.ts`
- Test: `src/domain/recommendations.test.ts`

**Interfaces:**

```ts
export interface FilterState {
  attributes: AttributeName[];
  mode: MatchMode;
  slots: string[];
  dungeons: string[];
}

export interface MatchResult {
  treasureId: string;
  dungeonId: string;
  totalWeight: number;
  hitWeight: number;
  probability: number;
  expectedRuns: number | null;
  matchedCombinationCount: number;
  matchedRowCount: number;
  matchedEntries: DropEntry[];
}

export function entryMatches(entry: DropEntry, filter: FilterState): boolean;
export function calculateMatch(treasure: Treasure, dungeon: Dungeon, filter: FilterState): MatchResult;
export function recommendTreasures(dataset: DropDataset, filter: FilterState): Recommendation[];
```

- [ ] **Step 1: Write failing tests for any/all and optional filters**

Cover:

```ts
it("matches any selected base attribute inside a combo");
it("requires every selected attribute in all mode");
it("treats empty attributes, slots, and dungeons as unrestricted");
it("sums matching row weights without rounding");
it("returns null expectedRuns for zero probability");
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
pnpm test src/domain/matching.test.ts src/domain/recommendations.test.ts
```

Expected: FAIL on missing exports.

- [ ] **Step 3: Implement matching and recommendation calculation**

Use `Set` intersection for `"any"` and `every()` containment for `"all"`. Filter by slot before attribute matching. Compute exact numerator/denominator, then derive best dungeon, average probability, and stable recommendation sorting.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: all matching and recommendation tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/matching.ts src/domain/recommendations.ts src/domain/*.test.ts
git commit -m "feat: implement weighted drop recommendations"
```

### Task 4: Implement JSON and zx1 Serialization

**Files:**
- Create: `src/domain/json-format.ts`
- Create: `src/domain/zx-format.ts`
- Create: `src/domain/serialization.ts`
- Test: `src/domain/serialization.test.ts`
- Create: `tests/fixtures/demo.zx`
- Create: `tests/fixtures/demo.json`

**Interfaces:**

```ts
export type DataFormat = "zx" | "json";
export interface ParseWarning { path: string; message: string; }
export interface ParseResult { dataset: DropDataset; warnings: ParseWarning[]; }

export function parseJsonData(input: string): ParseResult;
export function serializeJsonData(dataset: DropDataset): string;
export function parseZxData(input: Uint8Array): ParseResult;
export function serializeZxData(dataset: DropDataset): Uint8Array;
```

- [ ] **Step 1: Write failing JSON schema and round-trip tests**

Assert valid demo data round-trips, missing schema fields fail with paths, unknown fields are retained in warnings, and invalid non-positive weights are rejected.

- [ ] **Step 2: Run and verify RED**

```powershell
pnpm test src/domain/serialization.test.ts
```

Expected: FAIL because serializers are absent.

- [ ] **Step 3: Implement JSON parsing and validation**

Use Zod for versioned schema validation, normalize entries after parsing, and return warnings instead of silently dropping unknown attribute text.

- [ ] **Step 4: Add zx1 compatibility using golden data**

Port the original `zx1` decoder/encoder boundary into `src/domain/zx-format.ts`, preserving the outer `{"v":1,"alg":"zx1","data":"..."}` envelope. Validate decoded content against the existing golden fixture and verify serialize/parse round-trip bytes are stable for the fixture.

- [ ] **Step 5: Run and verify GREEN**

```powershell
pnpm test src/domain/serialization.test.ts
```

Expected: JSON and `.zx` contract tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/domain/json-format.ts src/domain/zx-format.ts src/domain/serialization.ts src/domain/serialization.test.ts tests/fixtures
git commit -m "feat: add json and zx1 data formats"
```

### Task 5: Build the shadcn Three-Column Workbench

**Files:**
- Create: `src/components/ui/*`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/filters/FilterSidebar.tsx`
- Create: `src/components/results/ResultsWorkspace.tsx`
- Create: `src/components/results/RecommendationTable.tsx`
- Create: `src/components/results/DetailPanel.tsx`
- Create: `src/components/TopCommandBar.tsx`
- Create: `src/store/app-store.ts`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Test: `src/components/filters/FilterSidebar.test.tsx`
- Test: `src/components/results/ResultsWorkspace.test.tsx`

**Interfaces:**

```ts
interface AppStore {
  dataset: DropDataset;
  filters: FilterState;
  selectedRecommendationId: string | null;
  activeResultTab: "recommendations" | "dungeon-details" | "hit-items";
  setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void;
  clearFilters(): void;
  selectRecommendation(id: string): void;
  setResultTab(tab: AppStore["activeResultTab"]): void;
}
```

- [ ] **Step 1: Write failing component tests**

Test that clicking an attribute toggles selected state, `不限` clears the group, selecting a result row updates the detail panel, and the empty-result state is visible when no recommendation exists.

- [ ] **Step 2: Run and verify RED**

```powershell
pnpm test src/components/filters/FilterSidebar.test.tsx src/components/results/ResultsWorkspace.test.tsx
```

Expected: FAIL because components are absent.

- [ ] **Step 3: Add shadcn primitives and theme tokens**

Use 8 px radius, dense 12–14 px body text, teal primary `#0f766e`, pale teal selection `#ccfbf1`, slate borders, and visible focus rings. Add `ResizablePanelGroup` with 20/50/30 defaults and persisted widths.

- [ ] **Step 4: Implement store and sidebar**

Initialize filters empty with `mode: "any"`. Keep group-level `全选` and `不限` behavior explicit. Render attribute combinations as toggle buttons with text labels, not unlabelled icons.

- [ ] **Step 5: Implement results and detail panels**

Derive recommendations with `recommendTreasures`, render TanStack Table with stable columns and sticky header, and update the right panel from the selected recommendation. Render a segmented result tab control and structured detail sections.

- [ ] **Step 6: Implement top actions and copy summary**

Connect clear filters, help dialog, native file actions, and clipboard copy. Show success/error Toasts with actionable messages.

- [ ] **Step 7: Run and verify GREEN**

```powershell
pnpm test src/components/filters/FilterSidebar.test.tsx src/components/results/ResultsWorkspace.test.tsx
pnpm build
```

Expected: component tests pass and Vite build exits 0.

- [ ] **Step 8: Commit**

```powershell
git add src/App.tsx src/components src/store src/index.css
git commit -m "feat: add shadcn three-column workbench"
```

### Task 6: Implement Native Data Editor Window

**Files:**
- Create: `src/editor/DataEditor.tsx`
- Create: `src/editor/editor-store.ts`
- Create: `src/editor/editor-actions.ts`
- Test: `src/editor/editor-actions.test.ts`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**

```ts
export interface EditorState {
  dungeonId: string;
  treasureId: string;
  draftEntries: DropEntry[];
  selectedEntryId: string | null;
}

export function addEntry(state: EditorState, entry: Omit<DropEntry, "id">): EditorState;
export function duplicateEntry(state: EditorState, id: string): EditorState;
export function moveEntry(state: EditorState, id: string, direction: "up" | "down"): EditorState;
export function removeEntry(state: EditorState, id: string): EditorState;
export function markAllVerified(state: EditorState): EditorState;
```

- [ ] **Step 1: Write failing editor action tests**

Cover add, duplicate, move up/down without crossing bounds, remove, batch verification, and preserving the selected row after non-destructive edits.

- [ ] **Step 2: Run and verify RED**

```powershell
pnpm test src/editor/editor-actions.test.ts
```

Expected: FAIL because editor actions are absent.

- [ ] **Step 3: Implement pure editor actions**

Use immutable array updates and stable entry IDs. Reject blank slot/attribute names and non-positive weights at form submission.

- [ ] **Step 4: Build editor UI**

Render a separate resizable Tauri window with dungeon/treasure selectors, entry table, edit form, quick attribute buttons, add/duplicate/move/delete/batch-verify controls, and save/reload actions.

- [ ] **Step 5: Run and verify GREEN**

```powershell
pnpm test src/editor/editor-actions.test.ts
pnpm build
```

Expected: tests and frontend build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/editor src-tauri/src/main.rs src-tauri/tauri.conf.json
git commit -m "feat: add native drop table editor"
```

### Task 7: Add Documentation, Demo Data, and Release Metadata

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `CHANGELOG.md`
- Create: `src/data/demo-data.json`
- Create: `public/screenshots/workbench.png`
- Modify: `.gitignore`
- Modify: `LICENSE`

- [ ] **Step 1: Document local development**

Document exact commands:

```powershell
pnpm install
pnpm dev
pnpm tauri:dev
pnpm test
pnpm lint
pnpm build
pnpm tauri:build
```

- [ ] **Step 2: Document data formats**

Explain `.zx` compatibility, JSON schema, demo data, real-data exclusion, and the probability formulas in Chinese and concise English.

- [ ] **Step 3: Add repository hygiene**

Ignore `node_modules/`, `dist/`, `src-tauri/target/`, `.superpowers/`, `*.zx`, `*.key`, local exports, and original PyInstaller binaries.

- [ ] **Step 4: Commit**

```powershell
git add README.md CONTRIBUTING.md CHANGELOG.md src/data/demo-data.json public/screenshots .gitignore LICENSE
git commit -m "docs: prepare open source release"
```

### Task 8: Verify, Package, and Publish

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Run the full verification gate**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm tauri:build
```

Expected: every command exits 0; record the generated Windows installer path.

- [ ] **Step 2: Audit repository contents**

Run:

```powershell
git status --short
rg --files -g '*.zx' -g '*.key' -g '.env*'
git diff --check
```

Expected: no real `.zx`, key, or environment files are tracked; `git diff --check` is clean.

- [ ] **Step 3: Create release tag**

```powershell
git tag -a v0.1.0 -m "release: first open source desktop drop filter"
```

- [ ] **Step 4: Configure remotes**

Use the user's confirmed repository URLs:

```powershell
git remote add github <github-repository-url>
git remote add gitee <gitee-repository-url>
git push -u github main
git push -u gitee main
git push github v0.1.0
git push gitee v0.1.0
```

- [ ] **Step 5: Publish release artifacts**

Upload the verified Windows installer to both repository releases, include the SHA-256 checksum, and verify both remotes contain the same commit and tag.

- [ ] **Step 6: Commit CI configuration**

```powershell
git add .github/workflows/build.yml src-tauri/tauri.conf.json
git commit -m "ci: add windows build workflow"
git push github main
git push gitee main
```

