import { useRef } from "react"
import { Button, Tooltip } from "@heroui/react"
import {
  Clipboard,
  Database,
  FileDown,
  FileUp,
  Grid2X2,
  ListFilter,
  RotateCcw,
  ScanLine,
} from "lucide-react"
import { toast } from "sonner"
import {
  parseJsonData,
  parseZxData,
  serializeJsonData,
  serializeZxData,
} from "@/domain/serialization"
import {
  parseTianGongConfig,
  serializeTianGongConfig,
} from "@/features/tiangong/config"
import { useTianGongStore } from "@/features/tiangong/tiangong-store"
import { useAppStore } from "@/store/app-store"
import type { AppMode } from "@/store/app-mode-store"
import type { AppUpdaterController } from "@/updater/use-app-updater"
import { UpdateStatusControl } from "@/updater/update-status-control"
import { ThemeMenu } from "./theme-menu"

function downloadFile(data: BlobPart, type: string, filename: string) {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: AppMode
  onChange: (mode: AppMode) => void
}) {
  return (
    <div
      aria-label="应用模式"
      className="ml-3 flex shrink-0 rounded-md border border-[var(--app-border)] bg-[var(--app-control)] p-1"
      role="group"
    >
      <Button
        className="app-mode-button"
        data-selected={String(mode === "drops")}
        size="sm"
        variant={mode === "drops" ? "primary" : "ghost"}
        onPress={() => onChange("drops")}
      >
        <ListFilter className="size-3.5" />
        秘境掉落
      </Button>
      <Button
        className="app-mode-button"
        data-selected={String(mode === "tiangong")}
        size="sm"
        variant={mode === "tiangong" ? "primary" : "ghost"}
        onPress={() => onChange("tiangong")}
      >
        <Grid2X2 className="size-3.5" />
        天工机巧盘
      </Button>
    </div>
  )
}

export function AppToolbar({
  mode,
  onModeChange,
  onOpenEditor,
  onOpenInventoryScan,
  updater,
}: {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  onOpenEditor: () => void
  onOpenInventoryScan: () => void
  updater: AppUpdaterController
}) {
  const clearFilters = useAppStore((state) => state.clearFilters)
  const setDataset = useAppStore((state) => state.setDataset)
  const dropInputRef = useRef<HTMLInputElement>(null)
  const configInputRef = useRef<HTMLInputElement>(null)

  const handleDropFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = file.name.toLowerCase().endsWith(".zx")
        ? parseZxData(new Uint8Array(await file.arrayBuffer()))
        : parseJsonData(await file.text())
      setDataset(parsed.dataset)
      toast.success(`已载入 ${file.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "数据文件解析失败")
    }
  }

  const handleConfigFile = async (file?: File) => {
    if (!file) return
    try {
      useTianGongStore.getState().loadConfig(parseTianGongConfig(await file.text()))
      toast.success(`已载入 ${file.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "机巧盘配置解析失败")
    }
  }

  const exportJson = () => {
    downloadFile(
      serializeJsonData(useAppStore.getState().dataset),
      "application/json;charset=utf-8",
      "drop-tables.json",
    )
    toast.success("JSON 数据已导出")
  }

  const exportZx = () => {
    const bytes = serializeZxData(useAppStore.getState().dataset)
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    downloadFile(copy.buffer, "application/octet-stream", "drop_tables.zx")
    toast.success(".zx 数据已导出")
  }

  const exportTianGong = () => {
    downloadFile(
      serializeTianGongConfig(useTianGongStore.getState().config),
      "application/json;charset=utf-8",
      "tiangong-board.json",
    )
    toast.success("机巧盘配置已导出")
  }

  const copyTitle = async () => {
    await navigator.clipboard.writeText("诛仙高手工具箱")
    toast.success("已复制项目标题")
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5">
      <div className="flex min-w-0 items-center">
        <div className="flex min-w-0 items-center gap-3">
          <img
            alt=""
            className="size-10 shrink-0 rounded-lg object-cover shadow-sm"
            src="/favicon.png"
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[var(--app-text)]">
              诛仙高手工具箱
            </p>
            <p className="truncate text-[11px] text-[var(--app-text-muted)]">
              {mode === "drops"
                ? "筛选秘境掉落收益"
                : "配置天工机巧盘并自动排列"}
            </p>
          </div>
        </div>
        <ModeSwitch mode={mode} onChange={onModeChange} />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {mode === "drops" ? (
          <>
            <input
              ref={dropInputRef}
              type="file"
              accept=".json,.zx,application/json,application/octet-stream"
              className="hidden"
              onChange={(event) => void handleDropFile(event.target.files?.[0])}
            />
            <Button className="toolbar-command" size="sm" variant="outline" onPress={() => dropInputRef.current?.click()}>
              <FileUp className="size-3.5 text-violet-600 dark:text-violet-300" />
              打开数据
            </Button>
            <Button className="toolbar-command" size="sm" variant="outline" onPress={exportJson}>
              <FileDown className="size-3.5 text-slate-600 dark:text-slate-300" />
              导出 JSON
            </Button>
            <Button className="toolbar-command" size="sm" variant="outline" onPress={exportZx}>
              <FileDown className="size-3.5 text-blue-600 dark:text-blue-300" />
              导出 .zx
            </Button>
            <Button
              className="toolbar-command toolbar-editor-command"
              data-shadow="none"
              size="sm"
              variant="secondary"
              onPress={onOpenEditor}
            >
              <Database className="size-3.5 text-teal-700 dark:text-teal-300" />
              数据编辑
            </Button>
            <Button
              className="toolbar-command"
              size="sm"
              variant="outline"
              onPress={() => {
                clearFilters()
                toast.success("筛选条件已清空")
              }}
            >
              <RotateCcw className="size-3.5 text-violet-600 dark:text-violet-300" />
              清空条件
            </Button>
          </>
        ) : (
          <>
            <Button className="toolbar-command" size="sm" variant="primary" onPress={onOpenInventoryScan}>
              <ScanLine className="size-3.5" />
              库存扫描
            </Button>
            <input
              ref={configInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => void handleConfigFile(event.target.files?.[0])}
            />
            <Button className="toolbar-command" size="sm" variant="outline" onPress={() => configInputRef.current?.click()}>
              <FileUp className="size-3.5 text-violet-600 dark:text-violet-300" />
              导入配置
            </Button>
            <Button className="toolbar-command" size="sm" variant="outline" onPress={exportTianGong}>
              <FileDown className="size-3.5 text-blue-600 dark:text-blue-300" />
              导出配置
            </Button>
            <Button
              className="toolbar-command"
              size="sm"
              variant="outline"
              onPress={() => {
                useTianGongStore.getState().resetConfig()
                toast.success("机巧盘已恢复默认")
              }}
            >
              <RotateCcw className="size-3.5 text-violet-600 dark:text-violet-300" />
              恢复默认
            </Button>
          </>
        )}
        <Tooltip>
          <Button
            aria-label="复制标题"
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => void copyTitle()}
          >
            <Clipboard className="size-4" />
          </Button>
          <Tooltip.Content>复制项目标题</Tooltip.Content>
        </Tooltip>
        <UpdateStatusControl controller={updater} />
        <ThemeMenu />
      </div>
    </header>
  )
}
