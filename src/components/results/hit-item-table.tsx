import { Table } from "@heroui/react"
import type { Recommendation } from "@/domain/types"
import { useAppStore } from "@/store/app-store"

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
  const rows = recommendations.flatMap((item) =>
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
  )

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <Table className="h-full rounded-none border-0 shadow-none" variant="secondary">
        <Table.ScrollContainer className="h-full overflow-auto">
          <Table.Content aria-label="命中装备列表" className="min-w-[980px]">
            <Table.Header className="sticky top-0 z-10 bg-[var(--app-surface-muted)]">
              <Table.Column isRowHeader>副本</Table.Column>
              <Table.Column>宝鉴</Table.Column>
              <Table.Column>部位</Table.Column>
              <Table.Column>属性</Table.Column>
              <Table.Column>概率</Table.Column>
              <Table.Column>期望次数</Table.Column>
              <Table.Column>权重</Table.Column>
              <Table.Column>展开属性</Table.Column>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row
                  key={row.id}
                  id={row.id}
                  className="cursor-pointer"
                  onClick={() => selectRecommendation(row.recommendationId)}
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
      {rows.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm text-[var(--app-text-muted)]">
          当前条件没有命中装备。
        </div>
      )}
    </div>
  )
}
