import { Button, Dropdown } from "@heroui/react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useAppTheme } from "@/theme/theme-provider"
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
      <Dropdown.Trigger>
        <Button aria-label="切换主题" isIconOnly size="sm" variant="ghost">
          <ActiveIcon className="size-4" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label="主题模式"
          onAction={(key) => setMode(String(key) as ThemeMode)}
        >
          {themeOptions.map((option) => {
            const Icon = option.icon
            return (
              <Dropdown.Item key={option.key} id={option.key} textValue={option.label}>
                <span className="flex min-w-36 items-center gap-2">
                  <Icon className="size-4 text-[var(--app-text-muted)]" />
                  <span className="flex-1">{option.label}</span>
                  {mode === option.key && <Check className="size-4 text-[var(--app-accent)]" />}
                </span>
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
