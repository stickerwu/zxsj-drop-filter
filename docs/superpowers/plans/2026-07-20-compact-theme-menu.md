# Compact Theme Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized theme dropdown presentation with a compact 128px HeroUI menu whose active mode is indicated only by a small right-aligned checkmark.

**Architecture:** Keep the existing `ThemeMenu` component and theme context unchanged. Use HeroUI's controlled single-selection menu and built-in item indicator, applying all visual changes through local utility classes and stable test attributes.

**Tech Stack:** React 19, TypeScript, HeroUI 3, Tailwind CSS 4, Lucide React, Vitest, Testing Library

## Global Constraints

- Keep the existing HeroUI `Dropdown` implementation.
- Keep the `light`, `dark`, and `system` theme modes.
- Keep the toolbar trigger and `切换主题` accessible label.
- Use a 128px-wide popover with a 6px radius.
- Use 34px-high options and 14px mode icons.
- Keep default and selected rows transparent.
- Show background color only for hover and keyboard focus.
- Show the active mode only with a right-aligned accent checkmark.
- Do not change application-wide theme tokens or toolbar layout.

## File Structure

- Modify `src/components/app/theme-menu.tsx`: controlled selection semantics and compact menu presentation.
- Create `src/components/app/theme-menu.test.tsx`: interaction and selected-indicator regression coverage.

---

### Task 1: Compact Theme Menu

**Files:**
- Create: `src/components/app/theme-menu.test.tsx`
- Modify: `src/components/app/theme-menu.tsx`

**Interfaces:**
- Consumes: `useAppTheme(): { mode: ThemeMode; resolvedTheme: ResolvedTheme; setMode(mode: ThemeMode): void }`
- Produces: the existing `ThemeMenu(): JSX.Element` component with unchanged external API.

- [ ] **Step 1: Write the failing component test**

Create `src/components/app/theme-menu.test.tsx`:

```tsx
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { THEME_STORAGE_KEY } from "@/theme/theme"
import { ThemeProvider } from "@/theme/theme-provider"
import { ThemeMenu } from "./theme-menu"

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("theme menu", () => {
  it("renders compact options and marks only the active theme", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeMenu />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole("button", { name: "切换主题" }))

    const menu = await screen.findByRole("menu", { name: "主题模式" })
    expect(menu).toHaveAttribute("data-density", "compact")

    const systemItem = screen
      .getByText("跟随系统")
      .closest('[data-slot="menu-item"]')
    expect(systemItem).toBeInTheDocument()
    expect(
      within(systemItem as HTMLElement).getByTestId("theme-selected-system"),
    ).toHaveAttribute("data-visible", "true")

    await user.click(screen.getByText("暗色"))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")

    await user.click(screen.getByRole("button", { name: "切换主题" }))
    const darkItem = screen.getByText("暗色").closest('[data-slot="menu-item"]')
    expect(
      within(darkItem as HTMLElement).getByTestId("theme-selected-dark"),
    ).toHaveAttribute("data-visible", "true")
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
pnpm vitest run src/components/app/theme-menu.test.tsx --reporter=verbose
```

Expected: FAIL because the current menu does not expose `data-density="compact"` or HeroUI item indicators.

- [ ] **Step 3: Implement the compact controlled menu**

Replace `src/components/app/theme-menu.tsx` with:

```tsx
import { Dropdown } from "@heroui/react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useAppTheme } from "@/theme/theme-context"
import type { ThemeMode } from "@/theme/theme"

const themeOptions: Array<{
  key: ThemeMode
  label: string
  icon: typeof Sun
}> = [
  { key: "light", label: "亮色", icon: Sun },
  { key: "dark", label: "暗色", icon: Moon },
  { key: "system", label: "跟随系统", icon: Monitor },
]

export function ThemeMenu() {
  const { mode, resolvedTheme, setMode } = useAppTheme()
  const ActiveIcon = mode === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="切换主题"
        className="flex size-8 items-center justify-center rounded-md text-[var(--app-text)] outline-none transition-colors hover:bg-[var(--app-control)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <ActiveIcon className="size-4" />
      </Dropdown.Trigger>
      <Dropdown.Popover
        className="w-32 min-w-32 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-[0_8px_20px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
        placement="bottom end"
      >
        <Dropdown.Menu
          aria-label="主题模式"
          className="w-full min-w-0 gap-0 p-0 outline-none"
          data-density="compact"
          selectedKeys={[mode]}
          selectionMode="single"
          onAction={(key) => setMode(String(key) as ThemeMode)}
        >
          {themeOptions.map((option) => {
            const Icon = option.icon
            return (
              <Dropdown.Item
                key={option.key}
                id={option.key}
                className="h-[34px] min-h-[34px] rounded-[5px] px-2 py-0 text-[13px] text-[var(--app-text)] outline-none data-[focused]:bg-[var(--app-control)] data-[hovered]:bg-[var(--app-control)] data-[selected]:bg-transparent"
                textValue={option.label}
              >
                <span className="flex w-full items-center gap-2">
                  <Icon className="size-3.5 shrink-0 text-[var(--app-text-muted)]" />
                  <span className="flex-1">{option.label}</span>
                  <Dropdown.ItemIndicator
                    className="ml-auto size-3.5 shrink-0 text-[var(--app-accent)] opacity-0 data-[visible]:opacity-100"
                    data-testid={`theme-selected-${option.key}`}
                  >
                    <Check className="size-3.5" strokeWidth={2.25} />
                  </Dropdown.ItemIndicator>
                </span>
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
pnpm vitest run src/components/app/theme-menu.test.tsx --reporter=verbose
```

Expected: PASS with one test.

- [ ] **Step 5: Run affected application tests**

Run:

```powershell
pnpm vitest run src/components/app/theme-menu.test.tsx src/components/app/app-shell.test.tsx
```

Expected: PASS with no theme-trigger or application-shell regression.

- [ ] **Step 6: Commit the component change**

```powershell
git add src/components/app/theme-menu.tsx src/components/app/theme-menu.test.tsx
git commit -m "style: simplify theme dropdown"
```

### Task 2: Visual and Repository Verification

**Files:**
- Verify: `src/components/app/theme-menu.tsx`
- Verify: `src/components/app/theme-menu.test.tsx`

**Interfaces:**
- Consumes: the completed `ThemeMenu` component from Task 1.
- Produces: verification evidence only; no new runtime interface.

- [ ] **Step 1: Run the full automated verification**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
& "$HOME\.cargo\bin\cargo.exe" check --manifest-path src-tauri/Cargo.toml
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Start the frontend for visual inspection**

Run:

```powershell
pnpm dev --host 127.0.0.1
```

Expected: Vite reports an available localhost URL.

- [ ] **Step 3: Verify the menu visually**

At a 1440x900 viewport:

- Open the theme trigger.
- Confirm the menu width is 128px and each item height is 34px.
- Confirm the selected row has no persistent fill.
- Confirm only the right checkmark identifies the active theme.
- Confirm hover/focus adds a light temporary background.
- Switch through light, dark, and system modes and confirm the menu remains readable.
- Confirm the popover does not overlap or resize the toolbar.

- [ ] **Step 4: Verify the final repository state**

Run:

```powershell
git status --short
git log -2 --oneline
```

Expected: clean worktree and the latest commit is `style: simplify theme dropdown`.
