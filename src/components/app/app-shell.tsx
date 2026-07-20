import { useState } from "react"
import { Search } from "lucide-react"
import { Toaster } from "sonner"
import { useAppStore } from "@/store/app-store"
import { useAppModeStore } from "@/store/app-mode-store"
import { useAppTheme } from "@/theme/theme-context"
import type { AppUpdaterController } from "@/updater/use-app-updater"
import { UpdateReadyDialog } from "@/updater/update-ready-dialog"
import { useAppUpdater } from "@/updater/use-app-updater"
import { DropEditorModal } from "@/components/editor/drop-editor-modal"
import { TianGongWorkspace } from "@/features/tiangong/tiangong-workspace"
import { useTianGongStore } from "@/features/tiangong/tiangong-store"
import { AppToolbar } from "./app-toolbar"
import { DropWorkspace } from "./drop-workspace"

export function AppShell({
  updaterController,
}: {
  updaterController?: AppUpdaterController
} = {}) {
  const dataset = useAppStore((state) => state.dataset)
  const mode = useAppModeStore((state) => state.mode)
  const setMode = useAppModeStore((state) => state.setMode)
  const activeCells = useTianGongStore((state) => state.config.activeCells.length)
  const { resolvedTheme } = useAppTheme()
  const [editorOpen, setEditorOpen] = useState(false)
  const nativeUpdater = useAppUpdater()
  const updater = updaterController ?? nativeUpdater
  const treasureCount = dataset.dungeons.reduce(
    (sum, dungeon) => sum + dungeon.treasures.length,
    0,
  )

  return (
    <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <AppToolbar
        mode={mode}
        updater={updater}
        onModeChange={(nextMode) => {
          setEditorOpen(false)
          setMode(nextMode)
        }}
        onOpenEditor={() => setEditorOpen(true)}
      />

      {mode === "drops" ? <DropWorkspace /> : <TianGongWorkspace />}

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface)] px-5 text-[11px] text-[var(--app-text-muted)]">
        {mode === "drops" ? (
          <span>
            已扫描 {dataset.dungeons.length} 个副本 · {treasureCount} 个宝鉴
          </span>
        ) : (
          <span>天工机巧盘 · 当前解锁 {activeCells} 格</span>
        )}
        <span className="flex items-center gap-1.5">
          <Search className="size-3.5" />
          本地计算 · 无网络上传
        </span>
      </footer>

      {editorOpen && mode === "drops" && (
        <DropEditorModal open onOpenChange={setEditorOpen} />
      )}
      <UpdateReadyDialog
        canOpen={!editorOpen}
        controller={updater}
      />
      <Toaster position="bottom-right" richColors theme={resolvedTheme} />
    </div>
  )
}
