import { Button, Card, Chip } from "@heroui/react"
import { Clipboard, Gem, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { Recommendation } from "@/domain/types"

const entryIconClasses = [
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
]

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatExpected(value: number | null) {
  return value === null ? "不可命中" : value.toFixed(2)
}

export function DetailPanel({
  recommendation,
}: {
  recommendation: Recommendation | undefined
}) {
  if (!recommendation) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--app-text-muted)]">
        点击中央表格中的宝鉴查看完整命中装备。
      </div>
    )
  }

  const copyDetails = async () => {
    await navigator.clipboard.writeText(
      `${recommendation.bestDungeonName} + ${recommendation.treasureName}\n`
      + `命中概率：${formatPercent(recommendation.bestProbability)}\n`
      + `期望次数：${formatExpected(recommendation.bestMatch.expectedRuns)}\n`
      + recommendation.bestMatch.matchedEntries
        .map((entry) => `${entry.slot} · ${entry.attributeCombo}`)
        .join("\n"),
    )
    toast.success("完整明细已复制")
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--app-accent)]" />
            <h2 className="truncate text-sm font-semibold text-[var(--app-text)]">
              {recommendation.treasureName}
            </h2>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--app-text-muted)]">
            <span className="truncate">{recommendation.bestDungeonName}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">
              最佳概率 {formatPercent(recommendation.bestProbability)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Card className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] shadow-none">
            <Card.Content className="p-3">
              <p className="text-[11px] text-[var(--app-text-muted)]">命中概率</p>
              <p className="mt-1 text-lg font-semibold text-[var(--app-accent)]">
                {formatPercent(recommendation.bestMatch.probability)}
              </p>
            </Card.Content>
          </Card>
          <Card className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] shadow-none">
            <Card.Content className="p-3">
              <p className="text-[11px] text-[var(--app-text-muted)]">期望次数</p>
              <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">
                {formatExpected(recommendation.bestMatch.expectedRuns)}
              </p>
            </Card.Content>
          </Card>
        </div>

        <section>
          <div className="mb-2 flex h-6 items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--app-text)]">全部命中装备</h3>
            <Chip size="sm" variant="soft">
              {recommendation.bestMatch.matchedEntries.length}
            </Chip>
          </div>
          <div className="space-y-2">
            {recommendation.bestMatch.matchedEntries.map((entry, index) => (
              <Card
                key={entry.id}
                className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] shadow-none"
              >
                <Card.Content className="flex items-start gap-2.5 p-2.5">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${entryIconClasses[index % entryIconClasses.length]}`}>
                    <Gem className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--app-text)]">
                      {entry.slot} · {entry.attributeCombo}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--app-text-muted)]">
                      展开属性：{entry.expandedAttributes.join(" + ")}
                    </p>
                  </div>
                  <Chip className="shrink-0" size="sm" variant="secondary">
                    权重 {entry.weight}
                  </Chip>
                </Card.Content>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold text-[var(--app-text)]">各副本表现</h3>
          <div className="space-y-1.5">
            {recommendation.dungeonDetails.map((detail) => (
              <div
                key={detail.dungeonId}
                className="flex items-center justify-between rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs"
              >
                <span className="truncate pr-2 text-[var(--app-text-muted)]">
                  {detail.dungeonName}
                </span>
                <span className="shrink-0 font-semibold text-[var(--app-accent)]">
                  {formatPercent(detail.probability)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <Button fullWidth size="sm" variant="outline" onPress={() => void copyDetails()}>
          <Clipboard className="size-3.5" />
          复制完整明细
        </Button>
      </div>
    </div>
  )
}
