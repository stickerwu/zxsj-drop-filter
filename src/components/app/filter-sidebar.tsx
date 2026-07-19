import { Button, Chip, Radio, RadioGroup, Surface, Tooltip } from "@heroui/react"
import { Info, RotateCcw, Settings2 } from "lucide-react"
import {
  FILTER_ATTRIBUTES,
  type AttributeFilterName,
  type MatchMode,
} from "@/domain/types"
import { useAppStore } from "@/store/app-store"

function FilterGroup({
  title,
  values,
  selected,
  onChange,
  columns = 3,
}: {
  title: string
  values: readonly string[]
  selected: string[]
  onChange: (value: string[]) => void
  columns?: 1 | 2 | 3
}) {
  const gridClass = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3"

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  return (
    <section className="border-b border-[var(--app-border)] px-4 py-3.5">
      <div className="mb-2.5 flex h-5 items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--app-text)]">{title}</h2>
        {selected.length > 0 && (
          <Chip size="sm" variant="soft">
            {selected.length}
          </Chip>
        )}
      </div>
      <div className={`grid ${gridClass} gap-1.5`}>
        {values.map((value) => {
          const isSelected = selected.includes(value)
          const isFullRow = columns === 1
          return (
            <Button
              key={value}
              className={`filter-option ${isFullRow ? "w-full justify-start px-3" : "min-w-0 justify-center px-2"}`}
              data-layout={isFullRow ? "full-row" : "grid"}
              data-selected={String(isSelected)}
              size="sm"
              variant="ghost"
              onPress={() => toggle(value)}
            >
              <span className="truncate">{value}</span>
            </Button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1">
        <Button
          className="h-7 px-2 text-[11px]"
          size="sm"
          variant="ghost"
          onPress={() => onChange([...values])}
        >
          全选
        </Button>
        <Button
          className="h-7 px-2 text-[11px]"
          size="sm"
          variant="ghost"
          onPress={() => onChange([])}
        >
          不限
        </Button>
      </div>
    </section>
  )
}

function MatchModeRadio({ value, children }: { value: MatchMode; children: string }) {
  return (
    <Radio value={value}>
      <Radio.Content className="flex cursor-pointer items-center gap-2 text-xs text-[var(--app-text-muted)]">
        <Radio.Control>
          <Radio.Indicator />
        </Radio.Control>
        {children}
      </Radio.Content>
    </Radio>
  )
}

export function FilterSidebar() {
  const filters = useAppStore((state) => state.filters)
  const dataset = useAppStore((state) => state.dataset)
  const setFilter = useAppStore((state) => state.setFilter)
  const clearFilters = useAppStore((state) => state.clearFilters)

  return (
    <aside className="flex h-full min-w-0 flex-col bg-[var(--app-surface)]">
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
            <Settings2 className="size-[17px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--app-text)]">筛选条件</h1>
            <p className="mt-0.5 truncate text-[11px] text-[var(--app-text-muted)]">
              留空表示不限，结果实时刷新
            </p>
          </div>
        </div>
        <Tooltip>
          <Button
            aria-label="清空筛选"
            className="shrink-0"
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={clearFilters}
          >
            <RotateCcw className="size-3.5 text-[var(--app-text-muted)]" />
          </Button>
          <Tooltip.Content>清空筛选</Tooltip.Content>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <FilterGroup
          title="想要的属性"
          values={FILTER_ATTRIBUTES}
          selected={filters.attributes}
          onChange={(value) => setFilter("attributes", value as AttributeFilterName[])}
        />

        <section className="border-b border-[var(--app-border)] px-4 py-4">
          <h2 className="mb-2.5 text-xs font-semibold text-[var(--app-text)]">属性匹配</h2>
          <RadioGroup
            aria-label="属性匹配方式"
            className="grid gap-2.5"
            value={filters.mode}
            onChange={(value) => setFilter("mode", value as MatchMode)}
          >
            <MatchModeRadio value="any">命中任一（推荐）</MatchModeRadio>
            <MatchModeRadio value="all">同一词条全满足</MatchModeRadio>
          </RadioGroup>
        </section>

        <FilterGroup
          title="装备部位"
          values={dataset.slots}
          selected={filters.slots}
          onChange={(value) => setFilter("slots", value)}
        />

        <FilterGroup
          title="限定副本"
          values={dataset.dungeons.map((dungeon) => dungeon.name)}
          selected={filters.dungeons}
          onChange={(value) => setFilter("dungeons", value)}
          columns={1}
        />

        <div className="px-4 py-5">
          <Surface className="rounded-md border border-[color-mix(in_srgb,var(--app-accent)_28%,transparent)] bg-[var(--app-accent-soft)] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text)]">
              <Info className="size-3.5 text-[var(--app-accent)]" />
              计算说明
            </div>
            <p className="text-[11px] leading-5 text-[var(--app-text-muted)]">
              命中概率 = 命中词条权重之和 ÷ 当前宝鉴总权重。
            </p>
            <p className="text-[11px] leading-5 text-[var(--app-text-muted)]">
              期望次数 = 1 ÷ 命中概率。
            </p>
          </Surface>
        </div>
      </div>
    </aside>
  )
}
