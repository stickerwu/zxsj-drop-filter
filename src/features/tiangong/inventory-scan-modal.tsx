import { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Chip, Modal } from "@heroui/react"
import {
  AlertTriangle,
  Check,
  Gamepad2,
  Keyboard,
  Plus,
  ScanLine,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react"
import { toast } from "sonner"
import {
  createEmptyInventorySnapshot,
  inventoryCounts,
  parseInventorySnapshot,
  scanCompleteness,
} from "./inventory"
import {
  nativeInventoryScannerClient,
  type GameWindowCandidate,
  type InventoryScannerClient,
} from "./inventory-client"
import { useTianGongStore } from "./tiangong-store"
import type {
  ScannedStone,
  ScannedStoneShape,
  TianGongInventorySnapshotV1,
} from "./types"

const shapeLabels: Record<ScannedStoneShape, string> = {
  square: "正方形",
  l: "L 型",
  t: "T 型",
  line: "一字型",
  j: "J 型",
  craft: "匠心石",
  unknown: "待确认",
}

export function InventoryScanModal({
  open,
  onOpenChange,
  client = nativeInventoryScannerClient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: InventoryScannerClient
}) {
  const [windows, setWindows] = useState<GameWindowCandidate[]>([])
  const [windowId, setWindowId] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState(createEmptyInventorySnapshot)
  const [selectedTab, setSelectedTab] = useState<"normal" | "craft">("normal")
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const completeness = useMemo(() => scanCompleteness(snapshot), [snapshot])
  const counts = useMemo(() => inventoryCounts(snapshot), [snapshot])

  useEffect(() => {
    if (!open) return
    void Promise.all([client.listWindows(), client.load()]).then(([found, saved]) => {
      setWindows(found)
      setWindowId(found.length === 1 ? found[0].windowId : "")
      if (saved) setSnapshot(parseInventorySnapshot(saved))
    }).catch((error) => toast.error(String(error)))
  }, [client, open])

  const capture = useCallback(async (id: string) => {
    if (busy || id !== sessionId) return
    setBusy(true)
    try {
      const next = parseInventorySnapshot(await client.capture(id))
      setSnapshot(next)
      setSelectedTab(next.craft.items.length > snapshot.craft.items.length ? "craft" : "normal")
      toast.success("当前库存页已识别")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }, [busy, client, sessionId, snapshot.craft.items.length])

  useEffect(() => {
    if (!open) return
    let dispose: () => void = () => undefined
    void client.listenHotkey((id) => void capture(id)).then((next) => {
      dispose = next
    })
    return () => dispose()
  }, [capture, client, open])

  useEffect(() => () => {
    if (sessionId) void client.cancel(sessionId)
  }, [client, sessionId])

  const start = async () => {
    setBusy(true)
    try {
      const result = await client.begin(windowId || undefined, muted)
      setSessionId(result.sessionId)
      setSnapshot(parseInventorySnapshot(result.snapshot))
      toast.success("扫描已开启，请在游戏中按 Ctrl+Shift+F8")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const updateTab = (
    tab: "normal" | "craft",
    update: (current: TianGongInventorySnapshotV1[typeof tab]) => TianGongInventorySnapshotV1[typeof tab],
  ) => setSnapshot((current) => ({ ...current, [tab]: update(current[tab]) }))

  const updateItem = (index: number, patch: Partial<ScannedStone>) =>
    updateTab(selectedTab, (tab) => ({
      ...tab,
      items: tab.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item),
      completed: tab.reportedCount === tab.items.length,
    }))

  const addItem = () => updateTab(selectedTab, (tab) => {
    const item: ScannedStone = {
      id: `${selectedTab}-manual-${crypto.randomUUID()}`,
      category: selectedTab,
      shape: selectedTab === "craft" ? "craft" : "unknown",
      elementRaw: null,
      qualityRaw: null,
      primaryAttributes: [],
      spiritAttributes: [],
      marks: ["手动新增"],
      confirmed: false,
      confidence: 0,
    }
    const items = [...tab.items, item]
    return { ...tab, items, completed: tab.reportedCount === items.length }
  })

  const apply = async () => {
    if (!completeness.canApply) return
    await client.save(snapshot)
    useTianGongStore.getState().applyInventory(counts)
    if (sessionId) await client.finish(sessionId)
    setSessionId(null)
    toast.success("库存数量已应用到机巧盘")
    onOpenChange(false)
  }

  const items = snapshot[selectedTab].items

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Trigger aria-hidden className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center">
          <Modal.Dialog className="h-[min(760px,calc(100vh-40px))] w-[min(1320px,calc(100vw-40px))] max-w-none overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl">
            <Modal.Header className="flex h-[72px] items-center gap-3 border-b px-5 py-0">
              <span className="flex size-10 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <ScanLine className="size-5" />
              </span>
              <div className="flex-1">
                <Modal.Heading className="text-lg font-semibold">游戏库存扫描核对</Modal.Heading>
                <p className="text-xs text-[var(--app-text-muted)]">窗口捕获与本地 OCR，不读取游戏内存，不发送输入</p>
              </div>
              <Chip size="sm" variant={sessionId ? "primary" : "soft"}>{sessionId ? "扫描中" : "未开始"}</Chip>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className="min-h-0 flex-1 p-0">
              <div className="grid h-full grid-cols-[260px_minmax(0,1fr)_280px]">
                <aside className="border-r bg-[var(--app-surface-muted)] p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold"><Gamepad2 className="size-4" />游戏窗口</h2>
                  <select className="mt-3 h-10 w-full rounded-md border bg-[var(--app-surface)] px-3 text-sm" value={windowId} onChange={(event) => setWindowId(event.target.value)}>
                    <option value="">请选择游戏窗口</option>
                    {windows.map((window) => <option key={window.windowId} value={window.windowId}>{window.title}</option>)}
                  </select>
                  {windows.length === 0 && <p className="mt-2 text-xs text-amber-600">未找到运行中的游戏客户端</p>}
                  <div className="mt-5 rounded-md border bg-[var(--app-surface)] p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold"><Keyboard className="size-4" />Ctrl+Shift+F8</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">手动滚动并保留至少一行重叠，再按热键采集。</p>
                  </div>
                  <Button className="mt-4 w-full" isDisabled={busy || !!sessionId || !windowId} variant="primary" onPress={() => void start()}>
                    <ScanLine className="size-4" />开启扫描
                  </Button>
                  <Button className="mt-2 w-full" isDisabled={!sessionId || busy} variant="outline" onPress={() => sessionId && void capture(sessionId)}>
                    {busy ? "正在识别…" : "采集当前页"}
                  </Button>
                  <Button className="mt-2 w-full" variant="ghost" onPress={() => setMuted((value) => !value)}>
                    {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}{muted ? "已静音" : "提示音开启"}
                  </Button>
                  <div className="mt-4 grid gap-2">
                    {(["normal", "craft"] as const).map((tab) => (
                      <label key={tab} className="flex items-center justify-between gap-2 text-xs">
                        <span>{tab === "normal" ? "机巧石总数" : "匠心石总数"}</span>
                        <input
                          aria-label={tab === "normal" ? "机巧石总数" : "匠心石总数"}
                          className="h-8 w-20 rounded-md border bg-[var(--app-surface)] px-2 text-right"
                          max={999}
                          min={0}
                          type="number"
                          value={snapshot[tab].reportedCount ?? ""}
                          onChange={(event) => updateTab(tab, (current) => {
                            const reportedCount = event.target.value === "" ? null : Number(event.target.value)
                            return { ...current, reportedCount, completed: reportedCount === current.items.length }
                          })}
                        />
                      </label>
                    ))}
                  </div>
                </aside>
                <main className="min-w-0 overflow-hidden">
                  <div className="flex h-14 items-center justify-between border-b px-4">
                    <div className="flex gap-2">
                      {(["normal", "craft"] as const).map((tab) => (
                        <Button key={tab} size="sm" variant={selectedTab === tab ? "primary" : "ghost"} onPress={() => setSelectedTab(tab)}>
                          {tab === "normal" ? "机巧石" : "匠心石"} {snapshot[tab].items.length}/{snapshot[tab].reportedCount ?? "?"}
                        </Button>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onPress={addItem}><Plus className="size-3.5" />手动新增</Button>
                  </div>
                  <div className="h-[calc(100%-56px)] overflow-y-auto p-3">
                    {items.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-[var(--app-text-muted)]">尚未采集当前页签</div> : items.map((item, index) => (
                      <div key={item.id} className="mb-2 grid grid-cols-[112px_70px_70px_minmax(100px,1fr)_minmax(100px,1fr)_64px_36px] items-center gap-2 rounded-md border bg-[var(--app-surface)] p-2 shadow-sm">
                        <select className="h-9 rounded-md border bg-transparent px-2" value={item.shape} onChange={(event) => updateItem(index, { shape: event.target.value as ScannedStoneShape, confirmed: true })}>
                          {Object.entries(shapeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <input className="h-9 rounded-md border bg-transparent px-2" placeholder="五行" value={item.elementRaw ?? ""} onChange={(event) => updateItem(index, { elementRaw: event.target.value, confirmed: true })} />
                        <input className="h-9 rounded-md border bg-transparent px-2" placeholder="品质" value={item.qualityRaw ?? ""} onChange={(event) => updateItem(index, { qualityRaw: event.target.value, confirmed: true })} />
                        <input className="h-9 min-w-0 rounded-md border bg-transparent px-2 text-xs" placeholder="主属性，顿号分隔" value={item.primaryAttributes.map((field) => field.raw).join("、")} onChange={(event) => updateItem(index, { primaryAttributes: event.target.value.split("、").filter(Boolean).map((raw) => ({ raw, confidence: 1 })), confirmed: true })} />
                        <input className="h-9 min-w-0 rounded-md border bg-transparent px-2 text-xs" placeholder="灵蕴，顿号分隔" value={item.spiritAttributes.map((field) => field.raw).join("、")} onChange={(event) => updateItem(index, { spiritAttributes: event.target.value.split("、").filter(Boolean).map((raw) => ({ raw, confidence: 1 })), confirmed: true })} />
                        <Chip
                          className={item.confidence < 0.8 && !item.confirmed ? "text-red-600 dark:text-red-400" : ""}
                          size="sm"
                          variant="soft"
                        >
                          {Math.round(item.confidence * 100)}%
                        </Chip>
                        <Button aria-label="删除条目" isIconOnly size="sm" variant="ghost" onPress={() => updateTab(selectedTab, (tab) => ({ ...tab, items: tab.items.filter((_, itemIndex) => itemIndex !== index), completed: false }))}><Trash2 className="size-4 text-red-500" /></Button>
                      </div>
                    ))}
                  </div>
                </main>
                <aside className="border-l bg-[var(--app-surface-muted)] p-4">
                  <h2 className="text-sm font-semibold">库存汇总</h2>
                  <div className="mt-3 space-y-2">
                    {Object.entries(counts).map(([shape, count]) => <div key={shape} className="flex items-center justify-between rounded-md border bg-[var(--app-surface)] px-3 py-2 text-sm"><span>{shapeLabels[shape as ScannedStoneShape]}</span><strong>{count}</strong></div>)}
                    <div className="flex items-center justify-between rounded-md border bg-[var(--app-surface)] px-3 py-2 text-sm"><span>匠心石</span><strong>{snapshot.craft.items.length}</strong></div>
                  </div>
                  <div className={`mt-4 rounded-md border p-3 text-xs leading-5 ${completeness.canApply ? "text-emerald-600" : "text-amber-600"}`}>
                    {completeness.canApply ? <><Check className="mr-1 inline size-4" />清单完整，可以应用</> : <><AlertTriangle className="mr-1 inline size-4" />仍有 {completeness.unresolvedItems} 个低置信度、{completeness.unknownShapes} 个未知形状，或页签数量未核对</>}
                  </div>
                </aside>
              </div>
            </Modal.Body>
            <Modal.Footer className="flex h-16 items-center justify-end gap-2 border-t bg-[var(--app-surface-muted)] px-5 py-0">
              <Button variant="outline" onPress={() => onOpenChange(false)}>取消</Button>
              <Button className="editor-save-button" isDisabled={!completeness.canApply} variant="primary" onPress={() => void apply()}>应用库存</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
