import { useMemo, useState } from "react"
import { Button, Dropdown, Table } from "@heroui/react"
import { Check, Funnel } from "lucide-react"
import type { Recommendation } from "@/domain/types"
import { useAppStore } from "@/store/app-store"

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatExpected(value: number | null) {
  return value === null ? "不可命中" : value.toFixed(2)
}

function ColumnFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: "宝鉴" | "部位"
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

export function HitItemTable({
  recommendations,
}: {
  recommendations: Recommendation[]
}) {
  const selectRecommendation = useAppStore((state) => state.selectRecommendation)
  const [selectedTreasures, setSelectedTreasures] = useState<Set<string>>(
    () => new Set(),
  )
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    () => new Set(),
  )
  const rows = useMemo(
    () => recommendations.flatMap((item) =>
      item.dungeonDetails.flatMap((detail) =>
        detail.matchedEntries.map((entry) => ({
          id: `${item.id}-${detail.dungeonId}-${entry.id}`,
          recommendationId: item.id,
          dungeonName: detail.dungeonName,
          treasureName: item.treasureName,
          entry,
          probability: detail.totalWeight > 0 ? entry.weight / detail.totalWeight : 0,
          expectedRuns: detail.expectedRuns,
        })),
      ),
    ),
    [recommendations],
  )
  const treasureOptions = useMemo(
    () => [...new Set(rows.map((row) => row.treasureName))]
      .sort((a, b) => a.localeCompare(b, "zh-CN")),
    [rows],
  )
  const slotOptions = useMemo(
    () => [...new Set(rows.map((row) => row.entry.slot))]
      .sort((a, b) => a.localeCompare(b, "zh-CN")),
    [rows],
  )
  const effectiveSelectedTreasures = useMemo(() => {
    const available = new Set(treasureOptions)
    return new Set([...selectedTreasures].filter((item) => available.has(item)))
  }, [selectedTreasures, treasureOptions])
  const effectiveSelectedSlots = useMemo(() => {
    const available = new Set(slotOptions)
    return new Set([...selectedSlots].filter((item) => available.has(item)))
  }, [selectedSlots, slotOptions])

  const filteredRows = useMemo(
    () => rows.filter((row) =>
      (
        effectiveSelectedTreasures.size === 0
        || effectiveSelectedTreasures.has(row.treasureName)
      )
      && (
        effectiveSelectedSlots.size === 0
        || effectiveSelectedSlots.has(row.entry.slot)
      )),
    [effectiveSelectedSlots, effectiveSelectedTreasures, rows],
  )
  const recommendationByRowId = new Map(
    rows.map((row) => [row.id, row.recommendationId]),
  )

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <Table className="result-table h-full rounded-none border-0 shadow-none" variant="secondary">
        <Table.ScrollContainer className="h-full overflow-auto">
          <Table.Content
            aria-label="命中装备列表"
            className="min-w-[780px]"
            data-density="reference"
            data-header-corners="square"
            onRowAction={(key) => {
              const recommendationId = recommendationByRowId.get(String(key))
              if (recommendationId) selectRecommendation(recommendationId)
            }}
          >
            <Table.Header className="result-table-header sticky top-0 z-10">
              <Table.Column data-readable-header="true" isRowHeader>副本</Table.Column>
              <Table.Column data-readable-header="true">
                <ColumnFilter
                  label="宝鉴"
                  options={treasureOptions}
                  selected={effectiveSelectedTreasures}
                  onChange={setSelectedTreasures}
                />
              </Table.Column>
              <Table.Column data-readable-header="true">
                <ColumnFilter
                  label="部位"
                  options={slotOptions}
                  selected={effectiveSelectedSlots}
                  onChange={setSelectedSlots}
                />
              </Table.Column>
              <Table.Column data-readable-header="true">属性</Table.Column>
              <Table.Column data-readable-header="true">概率</Table.Column>
              <Table.Column data-readable-header="true">期望次数</Table.Column>
              <Table.Column data-readable-header="true">权重</Table.Column>
              <Table.Column data-readable-header="true">展开属性</Table.Column>
            </Table.Header>
            <Table.Body>
              {filteredRows.map((row) => (
                <Table.Row
                  key={row.id}
                  id={row.id}
                  className="result-table-row cursor-pointer"
                >
                  <Table.Cell className="whitespace-nowrap">{row.dungeonName}</Table.Cell>
                  <Table.Cell>{row.treasureName}</Table.Cell>
                  <Table.Cell>{row.entry.slot}</Table.Cell>
                  <Table.Cell className="font-medium">{row.entry.attributeCombo}</Table.Cell>
                  <Table.Cell>{formatPercent(row.probability)}</Table.Cell>
                  <Table.Cell>{formatExpected(row.expectedRuns)}</Table.Cell>
                  <Table.Cell>{row.entry.weight}</Table.Cell>
                  <Table.Cell className="text-xs text-[var(--app-text-muted)]">
                    {row.entry.expandedAttributes.join(" + ")}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {filteredRows.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm text-[var(--app-text-muted)]">
          {rows.length === 0
            ? "当前条件没有命中装备。"
            : "当前列筛选没有命中装备。"}
        </div>
      )}
    </div>
  )
}
