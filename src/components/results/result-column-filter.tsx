import { useState } from "react"
import { Button, Dropdown } from "@heroui/react"
import { Check, Funnel } from "lucide-react"

export function ResultColumnFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
}) {
  const active = selected.size > 0
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span>{label}</span>
      <Dropdown isOpen={open} onOpenChange={setOpen}>
        <Dropdown.Trigger
          aria-label={`筛选${label}`}
          className={`flex size-7 shrink-0 items-center justify-center gap-0.5 rounded-md outline-none transition-colors ${
            active
              ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
              : "text-[var(--app-text-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
          }`}
          data-filter-active={active}
        >
          <Funnel className="size-3.5" />
          {active && (
            <span className="min-w-3 text-center text-[9px] font-bold leading-none">
              {selected.size}
            </span>
          )}
        </Dropdown.Trigger>
        <Dropdown.Popover
          className="w-48 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-[0_10px_28px_rgba(15,23,42,0.16)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.42)]"
          placement="bottom end"
        >
          <div className="flex h-9 items-center justify-between px-2">
            <span className="text-[12px] font-semibold text-[var(--app-text)]">
              筛选{label}
            </span>
            <Button
              aria-label={`清除${label}筛选`}
              className="h-7 min-w-0 rounded-md px-2 text-[11px]"
              isDisabled={!active}
              size="sm"
              variant="ghost"
              onPress={() => {
                onChange(new Set())
                setOpen(false)
              }}
            >
              清除
            </Button>
          </div>
          <Dropdown.Menu
            aria-label={`${label}筛选选项`}
            className="max-h-64 gap-0 overflow-y-auto p-0 outline-none"
            selectedKeys={[...selected]}
            selectionMode="multiple"
            onSelectionChange={(keys) => {
              onChange(
                keys === "all"
                  ? new Set(options)
                  : new Set(Array.from(keys, String)),
              )
            }}
          >
            {options.map((option) => (
              <Dropdown.Item
                key={option}
                id={option}
                className="h-8 min-h-8 rounded-[5px] px-2 py-0 text-[12px] text-[var(--app-text)] outline-none data-[focused]:bg-[var(--app-control)] data-[hovered]:bg-[var(--app-control)] data-[selected]:bg-[var(--app-accent-soft)]"
                textValue={option}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{option}</span>
                  <Dropdown.ItemIndicator className="static ml-auto size-3.5 shrink-0 text-[var(--app-accent)] opacity-0 data-[visible]:opacity-100">
                    <Check className="size-3.5" strokeWidth={2.25} />
                  </Dropdown.ItemIndicator>
                </span>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  )
}
