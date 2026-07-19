import { Chip, Table } from "@heroui/react"
import { Search } from "lucide-react"
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
      <Table className="result-table h-full rounded-none border-0 shadow-none" variant="secondary">
        <Table.ScrollContainer className="h-full overflow-auto">
          <Table.Content
            aria-label="推荐宝鉴列表"
            className="min-w-[800px]"
            data-density="reference"
            data-header-corners="square"
            onRowAction={(key) => selectRecommendation(String(key))}
          >
            <Table.Header className="result-table-header sticky top-0 z-10">
              <Table.Column className="w-14 text-center" data-readable-header="true">排名</Table.Column>
              <Table.Column data-readable-header="true" isRowHeader>宝鉴</Table.Column>
              <Table.Column data-readable-header="true">最佳概率</Table.Column>
              <Table.Column data-readable-header="true">最佳副本</Table.Column>
              <Table.Column data-readable-header="true">平均概率</Table.Column>
              <Table.Column data-readable-header="true">命中组合</Table.Column>
              <Table.Column data-readable-header="true">命中条数</Table.Column>
              <Table.Column className="min-w-[220px]" data-readable-header="true">预览（点选看完整）</Table.Column>
            </Table.Header>
            <Table.Body>
              {recommendations.map((item, index) => (
                <Table.Row
                  key={item.id}
                  id={item.id}
                  data-selected={String(selectedId === item.id)}
                  className={
                    selectedId === item.id
                      ? "result-table-row cursor-pointer bg-[var(--app-accent-soft)]"
                      : "result-table-row cursor-pointer"
                  }
                >
                  <Table.Cell className="text-center font-mono text-xs text-[var(--app-text-muted)]">
                    {index + 1}
                  </Table.Cell>
                  <Table.Cell className="font-semibold text-[var(--app-text)]">
                    {item.treasureName}
                  </Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant="primary">
                      {formatPercent(item.bestProbability)}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    {item.bestDungeonName}
                  </Table.Cell>
                  <Table.Cell>{formatPercent(item.averageProbability)}</Table.Cell>
                  <Table.Cell>{item.matchedCombinationCount}</Table.Cell>
                  <Table.Cell>{item.totalMatchedRows}</Table.Cell>
                  <Table.Cell className="max-w-[300px]">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-[var(--app-text-muted)]">
                        {item.bestMatch.matchedEntries
                          .slice(0, 4)
                          .map((entry) => `${entry.slot}·${entry.attributeCombo}`)
                          .join("、")}
                        {item.bestMatch.matchedEntries.length > 4
                          ? ` 等${item.bestMatch.matchedEntries.length}条`
                          : ""}
                      </span>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-control)] text-[var(--app-text-muted)]">
                        <Search className="size-3.5" />
                      </span>
                    </div>
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
