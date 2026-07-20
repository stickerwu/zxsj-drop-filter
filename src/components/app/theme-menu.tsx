import { useState } from "react"
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
  const [open, setOpen] = useState(false)
  const ActiveIcon =
    mode === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun

  return (
    <div className="relative">
      <button
        aria-label="切换主题"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex size-8 items-center justify-center rounded-md text-[var(--app-text)] outline-none transition-colors hover:bg-[var(--app-control)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <ActiveIcon className="size-4" />
      </button>

      {open ? (
        <div
          aria-label="主题模式"
          className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-[0_8px_20px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          data-density="compact"
          role="menu"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon
            const selected = mode === option.key

            return (
              <button
                key={option.key}
                className="flex h-[34px] w-full items-center gap-2 rounded-[5px] px-2 py-0 text-[13px] text-[var(--app-text)] outline-none hover:bg-[var(--app-control)] focus-visible:bg-[var(--app-control)]"
                role="menuitemradio"
                type="button"
                aria-checked={selected}
                onClick={() => {
                  setMode(option.key)
                  setOpen(false)
                }}
              >
                <Icon className="size-3.5 shrink-0 text-[var(--app-text-muted)]" />
                <span className="flex-1 text-left">{option.label}</span>
                <span
                  className="ml-auto inline-flex size-3.5 shrink-0 items-center justify-center text-[var(--app-accent)] opacity-0"
                  data-testid={`theme-selected-${option.key}`}
                  data-visible={selected ? "true" : "false"}
                >
                  {selected ? <Check className="size-3.5" strokeWidth={2.25} /> : null}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
