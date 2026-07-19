import { Button, Chip } from "@heroui/react"
import {
  Badge,
  BadgeCheck,
  CircleDot,
  Clipboard,
  Crown,
  Footprints,
  Gauge,
  Gem,
  Hand,
  Hexagon,
  RectangleVertical,
  ScrollText,
  Shield,
  Shirt,
  Sparkles,
  Target,
  Watch,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import type { Recommendation } from "@/domain/types"

const slotVisuals: Record<string, { icon: LucideIcon; className: string }> = {
  头部: { icon: Crown, className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  衣服: { icon: Shirt, className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  手部: { icon: Hand, className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  腰带: { icon: CircleDot, className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  腿部: { icon: RectangleVertical, className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  脚部: { icon: Footprints, className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  护符: { icon: Shield, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  护佩: { icon: BadgeCheck, className: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
  法印: { icon: ScrollText, className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  令牌: { icon: Badge, className: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300" },
  项链: { icon: Gem, className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  腕饰: { icon: Watch, className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  天灵: { icon: Sparkles, className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  地宝: { icon: Hexagon, className: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300" },
}

const fallbackSlotVisual = {
  icon: Gem,
  className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

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
      <div className="space-y-3.5 p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--app-text-muted)]">
          <span className="truncate">{recommendation.bestDungeonName}</span>
          <span className="shrink-0 font-medium text-[var(--app-accent)]">
            最佳概率 {formatPercent(recommendation.bestProbability)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-[var(--app-surface-muted)] p-3.5 shadow-[inset_0_0_0_1px_var(--app-border),0_4px_12px_rgba(31,45,61,0.05)]">
              <div className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
                <Target className="size-4 text-[var(--app-accent)]" />
                命中概率
              </div>
              <p className="mt-2 text-xl font-semibold text-[var(--app-accent)]">
                {formatPercent(recommendation.bestMatch.probability)}
              </p>
          </div>
          <div className="rounded-md bg-[var(--app-surface-muted)] p-3.5 shadow-[inset_0_0_0_1px_var(--app-border),0_4px_12px_rgba(31,45,61,0.05)]">
              <div className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
                <Gauge className="size-4 text-blue-600 dark:text-blue-300" />
                期望次数
              </div>
              <p className="mt-2 text-xl font-semibold text-[var(--app-text)]">
                {formatExpected(recommendation.bestMatch.expectedRuns)}
              </p>
          </div>
        </div>

        <section>
          <div className="mb-2 flex h-7 items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[var(--app-text)]">全部命中装备</h3>
            <Chip size="sm" variant="soft">
              {recommendation.bestMatch.matchedEntries.length}
            </Chip>
          </div>
          <div className="space-y-1.5">
            {recommendation.bestMatch.matchedEntries.map((entry) => {
              const visual = slotVisuals[entry.slot] ?? fallbackSlotVisual
              const EntryIcon = visual.icon
              return (
                <div
                  key={entry.id}
                  className="flex h-14 items-center gap-2.5 rounded-md bg-[var(--app-surface)] px-2.5 shadow-[0_3px_10px_rgba(31,45,61,0.10),inset_0_0_0_1px_var(--app-border)] transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(31,45,61,0.14),inset_0_0_0_1px_var(--app-border)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.28),inset_0_0_0_1px_var(--app-border)]"
                  data-detail-density="compact"
                  data-detail-entry
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-md ${visual.className}`}
                    data-slot-visual={entry.slot}
                  >
                    <EntryIcon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--app-text)]">
                      {entry.slot} · {entry.attributeCombo}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--app-text-muted)]">
                      展开属性：{entry.expandedAttributes.join(" + ")}
                    </p>
                  </div>
                  <Chip className="shrink-0" size="sm" variant="secondary">
                    权重 {entry.weight}
                  </Chip>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-[var(--app-text)]">各副本表现</h3>
          <div className="space-y-1.5">
            {recommendation.dungeonDetails.map((detail) => (
              <div
                key={detail.dungeonId}
                className="flex h-9 items-center justify-between rounded-md bg-[var(--app-surface)] px-3 text-xs shadow-[inset_0_0_0_1px_var(--app-border)]"
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
