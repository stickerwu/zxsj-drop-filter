# HeroUI v3 UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the visible desktop UI with HeroUI v3, add persisted light/dark/system themes, refine motion, and preserve all existing filtering, data editing, `.zx`, and recommendation behavior.

**Architecture:** Keep the domain, Zustand store, Tauri shell, and resizable panel layout. Replace the visible shadcn/Radix layer with focused HeroUI components, introduce a standalone theme controller, and split the current `App.tsx` into toolbar, filter, results, detail, and editor units.

**Tech Stack:** Tauri 2, React 19, TypeScript 6, HeroUI v3, Tailwind CSS v4, Zustand, react-resizable-panels, Vitest, Testing Library.

## Global Constraints

- Theme modes are exactly `light`, `dark`, and `system`; default is `system`.
- Theme choice must persist locally and react to system changes.
- Keep the 5 dungeons, 40 dungeon/treasure tables, 252 drop rows, 10 attributes, and 14 slots unchanged.
- Do not modify `.zx` encryption, normalization, matching, or recommendation behavior.
- Preserve 1440×900 primary layout and 1180×720 minimum layout without overlap.
- Respect `prefers-reduced-motion`.
- Use neutral gray surfaces with teal accents; do not introduce large blue, purple, or gradient-dominated areas.

---

### Task 1: Upgrade the UI toolchain and establish HeroUI styles

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `vite.config.ts`
- Modify: `src/index.css`
- Delete: `postcss.config.js`
- Delete: `tailwind.config.js`

**Interfaces:**
- Produces: HeroUI v3 and Tailwind CSS v4 available to all later UI tasks.
- Produces: CSS theme variables for `.light` and `.dark`.

- [ ] **Step 1: Record the current build baseline**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
```

Expected: 14 tests pass; lint and Vite build exit with code 0.

- [ ] **Step 2: Install the HeroUI v3 toolchain**

Run:

```powershell
pnpm add @heroui/react @heroui/styles
pnpm add -D tailwindcss@^4 @tailwindcss/vite
pnpm remove postcss autoprefixer
```

Expected: `package.json` contains `@heroui/react`, `@heroui/styles`, `tailwindcss` v4, and `@tailwindcss/vite`.

- [ ] **Step 3: Configure Vite for Tailwind v4**

Replace `vite.config.ts` with:

```ts
import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 4: Replace the global stylesheet foundation**

Start `src/index.css` with:

```css
@import "tailwindcss";
@import "@heroui/styles";

:root {
  color-scheme: light;
  --app-bg: #f5f7fa;
  --app-surface: #ffffff;
  --app-surface-muted: #f7f9fb;
  --app-border: #e4e9ef;
  --app-text: #172033;
  --app-text-muted: #718096;
  --app-accent: #0d9488;
  --app-accent-soft: #e6f8f5;
}

.dark {
  color-scheme: dark;
  --app-bg: #111315;
  --app-surface: #181b1f;
  --app-surface-muted: #202429;
  --app-border: #30363d;
  --app-text: #f2f5f7;
  --app-text-muted: #98a2ad;
  --app-accent: #2dd4bf;
  --app-accent-soft: #153b37;
}
```

Retain the existing font stack, minimum width, focus rules, and add:

```css
html,
body,
#root {
  height: 100%;
}

body {
  background: var(--app-bg);
  color: var(--app-text);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 5: Remove obsolete Tailwind v3 files**

Delete `tailwind.config.js` and `postcss.config.js`.

- [ ] **Step 6: Verify the dependency migration**

Run:

```powershell
pnpm build
```

Expected: Vite compiles with the Tailwind v4 plugin and resolves HeroUI styles.

- [ ] **Step 7: Commit**

```powershell
git add package.json pnpm-lock.yaml vite.config.ts src/index.css tailwind.config.js postcss.config.js
git commit -m "chore: migrate UI toolchain to HeroUI v3"
```

---

### Task 2: Add the persisted three-mode theme controller

**Files:**
- Create: `src/theme/theme.ts`
- Create: `src/theme/theme.test.ts`
- Create: `src/theme/theme-provider.tsx`
- Create: `src/components/app/theme-menu.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `ThemeMode = "light" | "dark" | "system"`.
- Produces: `resolveTheme(mode, prefersDark): "light" | "dark"`.
- Produces: `useAppTheme(): { mode, resolvedTheme, setMode }`.
- Produces: `<ThemeMenu />`.

- [ ] **Step 1: Write failing theme tests**

Create `src/theme/theme.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resolveTheme } from "./theme"

describe("theme resolution", () => {
  it("uses the explicit light and dark modes", () => {
    expect(resolveTheme("light", true)).toBe("light")
    expect(resolveTheme("dark", false)).toBe("dark")
  })

  it("resolves system mode from the media preference", () => {
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("system", false)).toBe("light")
  })
})
```

- [ ] **Step 2: Run the test and confirm failure**

Run:

```powershell
pnpm test -- src/theme/theme.test.ts
```

Expected: FAIL because `resolveTheme` does not exist.

- [ ] **Step 3: Implement theme types and resolution**

Create `src/theme/theme.ts`:

```ts
export type ThemeMode = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "zxsj-theme"

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  return mode === "system" ? (prefersDark ? "dark" : "light") : mode
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system"
}
```

- [ ] **Step 4: Implement the provider**

Create `src/theme/theme-provider.tsx` with a React context that:

```ts
type ThemeContextValue = {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}
```

Implementation requirements:

```ts
const initialMode = isThemeMode(localStorage.getItem(THEME_STORAGE_KEY))
  ? localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode
  : "system"
```

On mode or media query changes:

```ts
document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
document.documentElement.classList.toggle("light", resolvedTheme === "light")
document.documentElement.dataset.theme = resolvedTheme
localStorage.setItem(THEME_STORAGE_KEY, mode)
```

- [ ] **Step 5: Build the HeroUI theme menu**

Create `src/components/app/theme-menu.tsx` using HeroUI `Dropdown`, `DropdownTrigger`, `DropdownMenu`, `DropdownItem`, and `Button`. Use `Sun`, `Moon`, and `Monitor` icons. The selected key must equal the current `mode`.

- [ ] **Step 6: Mount the provider**

Wrap `<App />` in `src/main.tsx`:

```tsx
<StrictMode>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</StrictMode>
```

- [ ] **Step 7: Run tests**

```powershell
pnpm test -- src/theme/theme.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/theme src/components/app/theme-menu.tsx src/main.tsx
git commit -m "feat: add persisted light dark and system themes"
```

---

### Task 3: Rebuild the toolbar and filter sidebar with HeroUI

**Files:**
- Create: `src/components/app/app-toolbar.tsx`
- Create: `src/components/app/filter-sidebar.tsx`
- Create: `src/components/app/summary-strip.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAppStore`, existing serialization functions, `ThemeMenu`.
- Produces: `<AppToolbar onOpenEditor={() => void} />`.
- Produces: `<FilterSidebar />`.
- Produces: `<SummaryStrip recommendationCount matchedRows />`.

- [ ] **Step 1: Move toolbar behavior without changing handlers**

Create `app-toolbar.tsx` and move `handleFile`, `exportJson`, `exportZx`, `copyAll`, and clear-filter behavior from `App.tsx`.

Use HeroUI:

```tsx
<Button size="sm" variant="flat" startContent={<FileUp className="size-4" />}>
  打开数据
</Button>
```

Use icon-only buttons for theme and copy, each with a Tooltip and `aria-label`.

- [ ] **Step 2: Build the low-contrast toolbar layout**

Use:

```tsx
<header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5">
```

The title is `text-sm font-semibold`; the subtitle is `text-[11px] text-[var(--app-text-muted)]`.

- [ ] **Step 3: Move filter UI into `filter-sidebar.tsx`**

Use HeroUI `Button`, `Chip`, and `RadioGroup`. Keep `FILTER_ATTRIBUTES`, slots, and dungeons unchanged.

Filter button classes must provide stable dimensions:

```tsx
className="h-8 min-w-0 px-2 text-xs"
```

Selected filters use `color="primary"` and unselected filters use `variant="flat"`.

- [ ] **Step 4: Add the compact summary strip**

Create `summary-strip.tsx` with condition text on the first line and matched counts on the second line. Use `text-[11px]` for helper copy and `text-xs font-medium` for values.

- [ ] **Step 5: Replace the inline implementations in `App.tsx`**

Delete `CommandBar`, `FilterGroup`, `FilterSidebar`, `SlidersHorizontalIcon`, and `SummaryBanner` from `App.tsx`. Import the new focused components.

- [ ] **Step 6: Run verification**

```powershell
pnpm lint
pnpm build
```

Expected: both pass with no unused imports.

- [ ] **Step 7: Commit**

```powershell
git add src/components/app/app-toolbar.tsx src/components/app/filter-sidebar.tsx src/components/app/summary-strip.tsx src/App.tsx
git commit -m "feat: rebuild toolbar and filters with HeroUI"
```

---

### Task 4: Rebuild result Tabs and tables with HeroUI

**Files:**
- Create: `src/components/results/results-tabs.tsx`
- Create: `src/components/results/recommendation-table.tsx`
- Create: `src/components/results/dungeon-detail-table.tsx`
- Create: `src/components/results/hit-item-table.tsx`
- Create: `src/components/results/results-tabs.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Recommendation[]`, `useAppStore`.
- Produces: `<ResultsTabs recommendations />`.

- [ ] **Step 1: Write the failing Tab rendering test**

Create `results-tabs.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ResultsTabs } from "./results-tabs"

describe("results tabs", () => {
  it("renders all result views", () => {
    render(<ResultsTabs recommendations={[]} />)
    expect(screen.getByRole("tab", { name: /推荐宝鉴/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /副本.*宝鉴明细/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /命中装备列表/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Confirm the test fails**

```powershell
pnpm test -- src/components/results/results-tabs.test.tsx
```

Expected: FAIL because `ResultsTabs` does not exist.

- [ ] **Step 3: Implement HeroUI Tabs**

Use HeroUI `Tabs` and `Tab`:

```tsx
<Tabs
  aria-label="掉落结果"
  selectedKey={activeResultTab}
  onSelectionChange={(key) => setResultTab(String(key) as ResultTab)}
  variant="underlined"
  classNames={{
    tabList: "gap-5 border-b border-[var(--app-border)] px-4",
    cursor: "bg-[var(--app-accent)]",
    tab: "h-11 px-0 text-xs",
  }}
>
```

Each tab title contains a 14px icon and label.

- [ ] **Step 4: Implement the HeroUI recommendation table**

Use HeroUI `Table`, `TableHeader`, `TableColumn`, `TableBody`, `TableRow`, and `TableCell`. Preserve the eight columns and row selection. Probability uses `Chip size="sm" color="primary"`.

- [ ] **Step 5: Implement dungeon detail and hit item tables**

Keep the exact row calculations from the current `DungeonDetailsTable` and `HitItemsTable`. Use HeroUI Table sticky headers and empty content:

```tsx
emptyContent="当前条件没有命中掉落"
```

- [ ] **Step 6: Add restrained Tab animation**

Wrap active content in:

```tsx
<div className="animate-[tab-enter_150ms_ease-out]">
```

Define in `src/index.css`:

```css
@keyframes tab-enter {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 7: Run tests and build**

```powershell
pnpm test -- src/components/results/results-tabs.test.tsx
pnpm lint
pnpm build
```

Expected: test, lint, and build pass.

- [ ] **Step 8: Commit**

```powershell
git add src/components/results src/App.tsx src/index.css
git commit -m "feat: rebuild result tabs and tables with HeroUI"
```

---

### Task 5: Rebuild the detail panel

**Files:**
- Create: `src/components/app/detail-panel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Recommendation | undefined`.
- Produces: `<DetailPanel recommendation />`.

- [ ] **Step 1: Move detail rendering from `App.tsx`**

Create `detail-panel.tsx` and preserve probability, expected runs, matching entries, dungeon performance, and copy behavior.

- [ ] **Step 2: Replace bordered blocks with HeroUI surfaces**

Use HeroUI `Card`, `CardBody`, `Chip`, and `Button`. Keep cards at no more than 8px radius:

```tsx
<Card radius="sm" shadow="none" className="border border-[var(--app-border)] bg-[var(--app-surface-muted)]">
```

- [ ] **Step 3: Add semantic entry icons**

Use a deterministic palette based on entry index, limited to teal, blue, rose, amber, and violet icon backgrounds. Do not color the entire row.

- [ ] **Step 4: Verify layout**

Run:

```powershell
pnpm lint
pnpm build
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/components/app/detail-panel.tsx src/App.tsx
git commit -m "feat: refine recommendation detail panel"
```

---

### Task 6: Rebuild the drop editor with HeroUI Modal and Select

**Files:**
- Create: `src/components/editor/drop-editor-modal.tsx`
- Create: `src/components/editor/drop-editor-modal.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `open: boolean`, `onOpenChange(open: boolean): void`.
- Produces: `<DropEditorModal open onOpenChange />`.

- [ ] **Step 1: Write the failing interaction test**

Create a test that renders the modal, opens the dungeon Select, chooses `斩恨踏蜚境`, opens the attribute Select, chooses `会专`, and verifies the expanded field shows `会心 + 专精`.

- [ ] **Step 2: Confirm failure**

```powershell
pnpm test -- src/components/editor/drop-editor-modal.test.tsx
```

Expected: FAIL because the HeroUI modal does not exist.

- [ ] **Step 3: Implement the fixed-size HeroUI Modal**

Use:

```tsx
<Modal
  isOpen={open}
  onOpenChange={onOpenChange}
  size="5xl"
  scrollBehavior="inside"
  classNames={{
    base: "h-[720px] max-h-[calc(100vh-2rem)]",
    body: "min-h-0 overflow-hidden py-0",
  }}
>
```

Use `ModalHeader`, `ModalBody`, and `ModalFooter`.

- [ ] **Step 4: Implement HeroUI Select controls**

Use HeroUI `Select` and `SelectItem` for dungeon, treasure, slot, and attribute. Attribute items come only from `FILTER_ATTRIBUTES`.

All row controls use stable dimensions:

```tsx
className="h-9"
```

- [ ] **Step 5: Keep the footer fixed and the row list scrollable**

The modal body contains:

```tsx
<div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] gap-4">
```

The right list uses `overflow-y-auto`; the footer is outside that area.

- [ ] **Step 6: Validate positive weights before save**

Compute:

```ts
const hasInvalidWeight = entries.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)
```

Disable “保存并应用” when invalid and show an inline error message.

- [ ] **Step 7: Run the editor test and full suite**

```powershell
pnpm test -- src/components/editor/drop-editor-modal.test.tsx
pnpm test
pnpm lint
pnpm build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```powershell
git add src/components/editor/drop-editor-modal.tsx src/components/editor/drop-editor-modal.test.tsx src/App.tsx
git commit -m "feat: rebuild drop editor with HeroUI"
```

---

### Task 7: Assemble the application shell and remove obsolete UI code

**Files:**
- Create: `src/components/app/app-shell.tsx`
- Modify: `src/App.tsx`
- Delete unused files under: `src/components/ui/`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: a minimal `App.tsx` that renders `<AppShell />`.

- [ ] **Step 1: Create the shell**

`app-shell.tsx` owns:

- recommendations memoization;
- selected recommendation lookup;
- editor open state;
- left/center/right resizable layout;
- footer counts.

Use:

```tsx
<div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
```

- [ ] **Step 2: Reduce `App.tsx`**

Replace its contents with:

```tsx
import { AppShell } from "@/components/app/app-shell"

export default function App() {
  return <AppShell />
}
```

- [ ] **Step 3: Remove unused shadcn components**

Use `rg` to identify imports. Delete only wrappers no longer imported, then remove their unused Radix dependencies with `pnpm remove`.

Keep `react-resizable-panels`, Zustand, sonner, lucide-react, and testing packages.

- [ ] **Step 4: Verify no stale imports**

Run:

```powershell
rg -n "@/components/ui/" src
pnpm lint
pnpm build
```

Expected: no imports from deleted wrappers; lint/build pass.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "refactor: assemble HeroUI application shell"
```

---

### Task 8: Perform visual QA, release verification, and packaging

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Produces: release version `0.2.0`.
- Produces: `诛仙高手秘境掉落软件_0.2.0_x64-setup.exe`.

- [ ] **Step 1: Bump release metadata**

Set version `0.2.0` in npm, Tauri, Cargo, and Cargo lock metadata. Add a changelog entry describing HeroUI, themes, animation, tables, and editor changes.

- [ ] **Step 2: Run full verification**

```powershell
pnpm test
pnpm lint
pnpm build
git diff --check
```

Expected: all tests pass and all commands exit 0.

- [ ] **Step 3: Start the dev server**

```powershell
pnpm dev -- --host 127.0.0.1 --port 4173
```

- [ ] **Step 4: Inspect required states**

At 1440×900 and 1180×720 verify:

- light, dark, and system themes;
- all three result tabs;
- empty filters and a `专精` filter;
- editor modal, all Select menus, invalid weights, and save;
- no overlap, clipped labels, or layout movement.

- [ ] **Step 5: Build NSIS with the configured proxy**

```powershell
$env:Path = 'C:\Users\98521\.cargo\bin;C:\Users\98521\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin;' + $env:Path
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:HTTPS_PROXY='http://127.0.0.1:10808'
$env:ALL_PROXY='http://127.0.0.1:10808'
pnpm tauri build --bundles nsis
```

Expected installer:

```text
src-tauri/target/release/bundle/nsis/诛仙高手秘境掉落软件_0.2.0_x64-setup.exe
```

- [ ] **Step 6: Commit and tag**

```powershell
git add -A
git commit -m "release: HeroUI desktop redesign"
git tag -a v0.2.0 -m "release: 诛仙高手秘境掉落软件 0.2.0"
```

- [ ] **Step 7: Push both remotes**

```powershell
git push gitee main
git push gitee v0.2.0
git push github main
git push github v0.2.0
```
