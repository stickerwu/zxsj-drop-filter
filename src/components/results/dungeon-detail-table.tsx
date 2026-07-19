import { Chip, Table } from "@heroui/react"
import type { Recommendation } from "@/domain/types"
import { useAppStore } from "@/store/app-store"

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatExpected(value: number | null) {
  return value === null ? "不可命中" : value.toFixed(2)
}

export function DungeonDetailTable({
  recommendations,
}: {
  recommendations: Recommendation[]
}) {
  const selectRecommendation = useAppStore((state) => state.selectRecommendation)
  const rows = recommendations
    .flatMap((item) =>
      item.dungeonDetails.map((detail) => ({
        recommendationId: item.id,
        treasureName: item.treasureName,
        detail,
      })),
    )
    .sort(
      (left, right) =>
        right.detail.probability - left.detail.probability
        || right.detail.matchedRowCount - left.detail.matchedRowCount
        || left.detail.dungeonName.localeCompare(right.detail.dungeonName, "zh-CN"),
    )

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <Table className="h-full rounded-none border-0 shadow-none" variant="secondary">
        <Table.ScrollContainer className="h-full overflow-auto">
          <Table.Content aria-label="副本宝鉴明细" className="min-w-[980px]">
            <Table.Header className="sticky top-0 z-10 bg-[var(--app-surface-muted)]">
              <Table.Column className="w-16 text-center">排名</Table.Column>
              <Table.Column isRowHeader>副本</Table.Column>
              <Table.Column>宝鉴</Table.Column>
              <Table.Column>命中概率</Table.Column>
              <Table.Column>期望次数</Table.Column>
              <Table.Column>命中/总数</Table.Column>
              <Table.Column className="min-w-[300px]">预览（点选看完整）</Table.Column>
            </Table.Header>
            <Table.Body>
              {rows.map((row, index) => (
                <Table.Row
                  key={`${row.recommendationId}-${row.detail.dungeonId}`}
                  id={`${row.recommendationId}-${row.detail.dungeonId}`}
                  className="cursor-pointer"
                  onClick={() => selectRecommendation(row.recommendationId)}
                >
                  <Table.Cell className="text-center font-mono text-xs text-[var(--app-text-muted)]">
                    {index + 1}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap font-medium">
                    {row.detail.dungeonName}
                  </Table.Cell>
                  <Table.Cell>{row.treasureName}</Table.Cell>
                  <Table.Cell>
                    <Chip
                      size="sm"
                      variant={row.detail.probability >= 0.75 ? "primary" : "soft"}
                    >
                      {formatPercent(row.detail.probability)}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>{formatExpected(row.detail.expectedRuns)}</Table.Cell>
                  <Table.Cell>
                    {row.detail.matchedRowCount}/{row.detail.totalRowCount}
                  </Table.Cell>
                  <Table.Cell className="max-w-[380px] truncate text-xs text-[var(--app-text-muted)]">
                    {row.detail.matchedEntries
                      .slice(0, 4)
                      .map((entry) => `${entry.slot}·${entry.attributeCombo}`)
                      .join("、")}
                    {row.detail.matchedEntries.length > 4
                      ? ` 等${row.detail.matchedEntries.length}条`
                      : ""}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {rows.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm text-[var(--app-text-muted)]">
          当前条件没有副本宝鉴明细。
        </div>
      )}
    </div>
  )
}
