import { useRef } from "react"
import { Button, Tooltip } from "@heroui/react"
import {
  Clipboard,
  Database,
  FileDown,
  FileUp,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import {
  parseJsonData,
  parseZxData,
  serializeJsonData,
  serializeZxData,
} from "@/domain/serialization"
import { useAppStore } from "@/store/app-store"
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

export function AppToolbar({ onOpenEditor }: { onOpenEditor: () => void }) {
  const clearFilters = useAppStore((state) => state.clearFilters)
  const setDataset = useAppStore((state) => state.setDataset)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file?: File) => {
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

  const copyTitle = async () => {
    await navigator.clipboard.writeText("诛仙高手秘境掉落软件")
    toast.success("已复制项目标题")
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--app-accent)] text-white shadow-sm">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--app-text)]">
            诛仙高手秘境掉落软件
          </p>
          <p className="truncate text-[11px] text-[var(--app-text-muted)]">
            选择属性和部位，自动计算副本宝鉴掉落收益
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept=".json,.zx,application/json,application/octet-stream"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button size="sm" variant="outline" onPress={() => inputRef.current?.click()}>
          <FileUp className="size-3.5" />
          打开数据
        </Button>
        <Button size="sm" variant="outline" onPress={exportJson}>
          <FileDown className="size-3.5" />
          导出 JSON
        </Button>
        <Button size="sm" variant="outline" onPress={exportZx}>
          <FileDown className="size-3.5" />
          导出 .zx
        </Button>
        <Button size="sm" variant="secondary" onPress={onOpenEditor}>
          <Database className="size-3.5" />
          数据编辑
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => {
            clearFilters()
            toast.success("筛选条件已清空")
          }}
        >
          <RotateCcw className="size-3.5" />
          清空条件
        </Button>
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
        <ThemeMenu />
      </div>
    </header>
  )
}
