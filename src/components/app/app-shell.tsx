import { useMemo, useState } from "react"
import { Chip } from "@heroui/react"
import { GripVertical, Search } from "lucide-react"
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels"
import { Toaster } from "sonner"
import { recommendTreasures } from "@/domain/recommendations"
import { useAppStore } from "@/store/app-store"
import { useAppTheme } from "@/theme/theme-context"
import { DropEditorModal } from "@/components/editor/drop-editor-modal"
import { ResultsTabs } from "@/components/results/results-tabs"
import { AppToolbar } from "./app-toolbar"
import { DetailPanel } from "./detail-panel"
import { FilterSidebar } from "./filter-sidebar"
import { SummaryStrip } from "./summary-strip"

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function PanelDivider() {
  return (
    <PanelResizeHandle className="group relative flex w-px shrink-0 items-center justify-center bg-[var(--app-border)] outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 focus-visible:bg-[var(--app-accent)]">
      <span className="z-10 flex h-6 w-3 items-center justify-center rounded-sm border border-[var(--app-border)] bg-[var(--app-surface)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <GripVertical className="size-2.5 text-[var(--app-text-muted)]" />
      </span>
    </PanelResizeHandle>
  )
}

export function AppShell() {
  const dataset = useAppStore((state) => state.dataset)
  const filters = useAppStore((state) => state.filters)
  const selectedRecommendationId = useAppStore(
    (state) => state.selectedRecommendationId,
  )
  const { resolvedTheme } = useAppTheme()
  const [editorOpen, setEditorOpen] = useState(false)
  const recommendations = useMemo(
    () => recommendTreasures(dataset, filters),
    [dataset, filters],
  )
  const selected = recommendations.find(
    (item) => item.id === selectedRecommendationId,
  ) ?? recommendations[0]
  const matchedRows = recommendations.reduce(
    (sum, item) => sum + item.totalMatchedRows,
    0,
  )
  const treasureCount = dataset.dungeons.reduce(
    (sum, dungeon) => sum + dungeon.treasures.length,
    0,
  )

  return (
    <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <AppToolbar onOpenEditor={() => setEditorOpen(true)} />

      <div className="min-h-0 flex-1 p-3">
        <PanelGroup
          direction="horizontal"
          className="h-full overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm"
        >
          <Panel defaultSize={21} minSize={17}>
            <FilterSidebar />
          </Panel>
          <PanelDivider />
          <Panel defaultSize={49} minSize={35}>
            <main className="flex h-full min-w-0 flex-col bg-[var(--app-surface)]">
              <SummaryStrip
                recommendationCount={recommendations.length}
                matchedRows={matchedRows}
              />
              <ResultsTabs recommendations={recommendations} />
            </main>
          </Panel>
          <PanelDivider />
          <Panel defaultSize={30} minSize={22}>
            <aside className="flex h-full min-w-0 flex-col bg-[var(--app-surface)]">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--app-border)] px-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--app-accent)]">
                    推荐宝鉴
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--app-text)]">
                    {selected?.treasureName ?? "暂无结果"}
                  </p>
                </div>
                {selected && (
                  <Chip className="shrink-0" size="sm" variant="primary">
                    {formatPercent(selected.bestProbability)}
                  </Chip>
                )}
              </div>
              <div className="min-h-0 flex-1">
                <DetailPanel recommendation={selected} />
              </div>
            </aside>
          </Panel>
        </PanelGroup>
      </div>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface)] px-5 text-[11px] text-[var(--app-text-muted)]">
        <span>
          已扫描 {dataset.dungeons.length} 个副本 · {treasureCount} 个宝鉴
        </span>
        <span className="flex items-center gap-1.5">
          <Search className="size-3.5" />
          本地计算 · 无网络上传
        </span>
      </footer>

      <DropEditorModal open={editorOpen} onOpenChange={setEditorOpen} />
      <Toaster position="bottom-right" richColors theme={resolvedTheme} />
    </div>
  )
}
