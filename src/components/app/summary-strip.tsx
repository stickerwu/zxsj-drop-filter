import { Chip } from "@heroui/react"
import { CheckCircle2 } from "lucide-react"
import { useAppStore } from "@/store/app-store"

export function SummaryStrip({
  recommendationCount,
  matchedRows,
}: {
  recommendationCount: number
  matchedRows: number
}) {
  const filters = useAppStore((state) => state.filters)
  const attributesText = filters.attributes.length
    ? filters.attributes.join(" + ")
    : "不限属性"
  const modeText = filters.mode === "any" ? "命中任一" : "同一词条全满足"

  return (
    <div className="shrink-0 border-b border-[var(--app-border)] bg-[var(--app-accent-soft)] px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--app-text-muted)]">
        <span className="shrink-0 font-semibold text-[var(--app-text)]">当前条件</span>
        <span className="truncate">{attributesText}</span>
        <span aria-hidden="true">·</span>
        <span className="shrink-0">{modeText}</span>
        <span aria-hidden="true">·</span>
        <span className="shrink-0">
          {filters.slots.length ? `${filters.slots.length} 个部位` : "部位不限"}
        </span>
        <span aria-hidden="true">·</span>
        <span className="truncate">
          {filters.dungeons.length
            ? filters.dungeons.join("、")
            : "副本不限"}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <CheckCircle2 className="size-3.5 text-[var(--app-accent)]" />
        <span className="text-xs font-medium text-[var(--app-text)]">
          {matchedRows} 条掉落
        </span>
        <Chip size="sm" variant="soft">
          {recommendationCount} 个推荐宝鉴
        </Chip>
      </div>
    </div>
  )
}
