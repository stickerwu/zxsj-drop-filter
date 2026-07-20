import { useId } from "react"
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
  const menuLabelId = useId()
  const ActiveIcon =
    mode === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun

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
        <span id={menuLabelId} className="sr-only">
          主题模式
        </span>
        <Dropdown.Menu
          aria-label="主题模式"
          aria-labelledby={menuLabelId}
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
