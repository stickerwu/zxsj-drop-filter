import { Chip, Table } from "@heroui/react"
import type { Recommendation } from "@/domain/types"
import { useAppStore } from "@/store/app-store"

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

export function RecommendationTable({
  recommendations,
}: {
  recommendations: Recommendation[]
}) {
  const selectedId = useAppStore((state) => state.selectedRecommendationId)
  const selectRecommendation = useAppStore((state) => state.selectRecommendation)

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <Table className="h-full rounded-none border-0 shadow-none" variant="secondary">
        <Table.ScrollContainer className="h-full overflow-auto">
          <Table.Content aria-label="推荐宝鉴列表" className="min-w-[1040px]">
            <Table.Header className="sticky top-0 z-10 bg-[var(--app-surface-muted)]">
              <Table.Column className="w-16 text-center">推荐</Table.Column>
              <Table.Column isRowHeader>宝鉴</Table.Column>
              <Table.Column>最佳概率</Table.Column>
              <Table.Column>最佳副本</Table.Column>
              <Table.Column>平均概率</Table.Column>
              <Table.Column>命中组合</Table.Column>
              <Table.Column>命中条数</Table.Column>
              <Table.Column className="min-w-[280px]">预览（点选看完整）</Table.Column>
            </Table.Header>
            <Table.Body>
              {recommendations.map((item, index) => (
                <Table.Row
                  key={item.id}
                  id={item.id}
                  className={
                    selectedId === item.id
                      ? "cursor-pointer bg-[var(--app-accent-soft)]"
                      : "cursor-pointer"
                  }
                  onClick={() => selectRecommendation(item.id)}
                >
                  <Table.Cell className="text-center font-mono text-xs text-[var(--app-text-muted)]">
                    {index + 1}
                  </Table.Cell>
                  <Table.Cell className="font-semibold text-[var(--app-text)]">
                    {item.treasureName}
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      size="sm"
                      variant={item.bestProbability >= 0.75 ? "primary" : "soft"}
                    >
                      {formatPercent(item.bestProbability)}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    {item.bestDungeonName}
                  </Table.Cell>
                  <Table.Cell>{formatPercent(item.averageProbability)}</Table.Cell>
                  <Table.Cell>{item.matchedCombinationCount}</Table.Cell>
                  <Table.Cell>{item.totalMatchedRows}</Table.Cell>
                  <Table.Cell className="max-w-[360px] truncate text-xs text-[var(--app-text-muted)]">
                    {item.bestMatch.matchedEntries
                      .slice(0, 4)
                      .map((entry) => `${entry.slot}·${entry.attributeCombo}`)
                      .join("、")}
                    {item.bestMatch.matchedEntries.length > 4
                      ? ` 等${item.bestMatch.matchedEntries.length}条`
                      : ""}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {recommendations.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm text-[var(--app-text-muted)]">
          当前条件没有命中掉落，请放宽属性或部位限制。
        </div>
      )}
    </div>
  )
}
