import { useMemo, useState } from "react"
import { Table } from "@heroui/react"
import type { Recommendation } from "@/domain/types"
import { useAppStore } from "@/store/app-store"
import { ResultColumnFilter } from "./result-column-filter"

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatExpected(value: number | null) {
  return value === null ? "不可命中" : value.toFixed(2)
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
                <ResultColumnFilter
                  label="宝鉴"
                  options={treasureOptions}
                  selected={effectiveSelectedTreasures}
                  onChange={setSelectedTreasures}
                />
              </Table.Column>
              <Table.Column data-readable-header="true">
                <ResultColumnFilter
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
