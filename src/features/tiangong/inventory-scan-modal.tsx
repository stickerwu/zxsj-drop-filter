import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Button,
  Chip,
  Input,
  ListBox,
  Modal,
  NumberField,
  Select,
  Surface,
  Switch,
  Tabs,
} from "@heroui/react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Gamepad2,
  Keyboard,
  Minus,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
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
  type AutoScanPhase,
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

const ordinaryShapeOptions = [
  "square",
  "l",
  "t",
  "line",
  "j",
  "unknown",
] as const

type ScanUiPhase = "idle" | "error" | AutoScanPhase

const scanPhaseLabels: Record<ScanUiPhase, string> = {
  idle: "等待开启",
  waiting: "等待画面停稳",
  scrolling: "检测到滚动",
  stable: "准备自动采集",
  captured: "已采集当前画面",
  recognizing: "正在识别",
  error: "需要调整画面",
}

function ScannerSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ id: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <Select
      aria-label={label}
      className="inventory-scan-select"
      fullWidth
      selectedKey={value || null}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key))
      }}
    >
      <Select.Trigger className="h-10 min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="max-h-72 min-w-[var(--trigger-width)] border border-[var(--app-border)] bg-[var(--app-surface)]">
        <ListBox aria-label={label}>
          {options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              <span className="flex w-full items-center justify-between gap-3">
                <span className="truncate">{option.label}</span>
                <ListBox.ItemIndicator>
                  {({ isSelected }) =>
                    isSelected
                      ? <Check className="size-3.5 text-[var(--app-accent)]" />
                      : null
                  }
                </ListBox.ItemIndicator>
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

function ReportedCountField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <NumberField
      aria-label={label}
      className="w-[104px]"
      maxValue={999}
      minValue={0}
      value={value ?? undefined}
      onChange={(nextValue) =>
        onChange(Number.isFinite(nextValue) ? nextValue : null)}
    >
      <NumberField.Group className="flex h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <NumberField.DecrementButton
          aria-label={`减少${label}`}
          className="flex w-7 items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-control)]"
        >
          <Minus className="size-3" />
        </NumberField.DecrementButton>
        <NumberField.Input className="min-w-0 flex-1 border-x border-[var(--app-border)] bg-transparent px-0 text-center text-sm font-semibold text-[var(--app-text)] outline-none" />
        <NumberField.IncrementButton
          aria-label={`增加${label}`}
          className="flex w-7 items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-control)]"
        >
          <Plus className="size-3" />
        </NumberField.IncrementButton>
      </NumberField.Group>
    </NumberField>
  )
}

function ScanItemCard({
  item,
  index,
  onUpdate,
  onDelete,
}: {
  item: ScannedStone
  index: number
  onUpdate: (patch: Partial<ScannedStone>) => void
  onDelete: () => void
}) {
  const lowConfidence = item.confidence < 0.8 && !item.confirmed
  const shapeOptions = item.category === "craft"
    ? ["craft", "unknown"] as const
    : ordinaryShapeOptions
  const fieldClass = lowConfidence
    ? "inventory-scan-input border-amber-400/80 bg-amber-50/70 dark:bg-amber-950/20"
    : "inventory-scan-input"

  return (
    <Surface
      className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[0_5px_16px_rgba(31,45,61,0.07)] dark:shadow-[0_7px_20px_rgba(0,0,0,0.24)]"
      data-confidence={lowConfidence ? "low" : "ok"}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-xs font-bold text-[var(--app-accent)]">
          {index + 1}
        </span>
        <div className="w-36 shrink-0">
          <ScannerSelect
            label={`第 ${index + 1} 项形状`}
            value={item.shape}
            options={shapeOptions.map((shape) => ({
              id: shape,
              label: shapeLabels[shape],
            }))}
            onChange={(shape) =>
              onUpdate({
                shape: shape as ScannedStoneShape,
                confirmed: true,
              })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[var(--app-text)]">
            {item.elementRaw || "未识别五行"} · {item.qualityRaw || "未识别品质"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--app-text-muted)]">
            {item.marks.length > 0 ? item.marks.join(" · ") : "暂无标记"}
          </p>
        </div>
        <Chip
          className={lowConfidence
            ? "border border-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
            : ""}
          size="sm"
          variant="soft"
        >
          {Math.round(item.confidence * 100)}%
        </Chip>
        <Button
          className={item.confirmed
            ? "h-8 rounded-md bg-emerald-50 px-2.5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "h-8 rounded-md px-2.5"}
          size="sm"
          variant={item.confirmed ? "secondary" : "outline"}
          onPress={() => onUpdate({ confirmed: !item.confirmed })}
        >
          <CheckCircle2 className="size-3.5" />
          {item.confirmed ? "已核对" : "确认"}
        </Button>
        <Button
          aria-label={`删除第 ${index + 1} 项`}
          className="editor-delete-button size-8 min-w-8 rounded-md"
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-[96px_96px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <Input
          aria-label={`第 ${index + 1} 项五行`}
          className={fieldClass}
          placeholder="五行"
          value={item.elementRaw ?? ""}
          onChange={(event) =>
            onUpdate({ elementRaw: event.target.value, confirmed: true })}
        />
        <Input
          aria-label={`第 ${index + 1} 项品质`}
          className={fieldClass}
          placeholder="品质"
          value={item.qualityRaw ?? ""}
          onChange={(event) =>
            onUpdate({ qualityRaw: event.target.value, confirmed: true })}
        />
        <Input
          aria-label={`第 ${index + 1} 项主属性`}
          className={`${fieldClass} text-xs`}
          placeholder="主属性，顿号分隔"
          value={item.primaryAttributes.map((field) => field.raw).join("、")}
          onChange={(event) =>
            onUpdate({
              primaryAttributes: event.target.value
                .split("、")
                .filter(Boolean)
                .map((raw) => ({ raw, confidence: 1 })),
              confirmed: true,
            })}
        />
        <Input
          aria-label={`第 ${index + 1} 项灵蕴`}
          className={`${fieldClass} text-xs`}
          placeholder="灵蕴，顿号分隔"
          value={item.spiritAttributes.map((field) => field.raw).join("、")}
          onChange={(event) =>
            onUpdate({
              spiritAttributes: event.target.value
                .split("、")
                .filter(Boolean)
                .map((raw) => ({ raw, confidence: 1 })),
              confirmed: true,
            })}
        />
      </div>
    </Surface>
  )
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
  const [loadingWindows, setLoadingWindows] = useState(true)
  const [muted, setMuted] = useState(false)
  const [continuousScan, setContinuousScan] = useState(true)
  const [scanPhase, setScanPhase] = useState<ScanUiPhase>("idle")
  const [scanError, setScanError] = useState<string | null>(null)
  const captureInFlight = useRef(false)
  const completeness = useMemo(() => scanCompleteness(snapshot), [snapshot])
  const counts = useMemo(() => inventoryCounts(snapshot), [snapshot])
  const selectedWindow = windows.find((window) => window.windowId === windowId)

  const refreshWindows = useCallback(async (notify = false) => {
    setLoadingWindows(true)
    try {
      const found = await client.listWindows()
      setWindows(found)
      setWindowId((current) => {
        if (found.some((window) => window.windowId === current)) return current
        return found.length === 1 ? found[0].windowId : ""
      })
      if (notify) {
        if (found.length === 0) toast.warning("仍未检测到诛仙世界游戏窗口")
        else toast.success(`已检测到 ${found.length} 个游戏窗口`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setLoadingWindows(false)
    }
  }, [client])

  useEffect(() => {
    if (!open) return
    let active = true
    void Promise.all([client.listWindows(), client.load()])
      .then(([found, saved]) => {
        if (!active) return
        setWindows(found)
        setWindowId(found.length === 1 ? found[0].windowId : "")
        if (saved) setSnapshot(parseInventorySnapshot(saved))
      })
      .catch((error) => toast.error(String(error)))
      .finally(() => {
        if (active) setLoadingWindows(false)
      })
    return () => {
      active = false
    }
  }, [client, open])

  useEffect(() => {
    if (!open || loadingWindows || sessionId || windows.length > 0) return
    const timer = window.setInterval(() => void refreshWindows(), 3000)
    return () => window.clearInterval(timer)
  }, [loadingWindows, open, refreshWindows, sessionId, windows.length])

  const capture = useCallback(async (id: string) => {
    if (captureInFlight.current || id !== sessionId) return
    captureInFlight.current = true
    setBusy(true)
    setScanPhase("recognizing")
    setScanError(null)
    try {
      const next = parseInventorySnapshot(await client.capture(id))
      setSnapshot(next)
      setSelectedTab(
        next.craft.items.length > snapshot.craft.items.length ? "craft" : "normal",
      )
      toast.success("当前库存页已识别")
      setScanPhase("captured")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setScanError(message)
      setScanPhase("error")
      toast.error(message)
    } finally {
      captureInFlight.current = false
      setBusy(false)
    }
  }, [client, sessionId, snapshot.craft.items.length])

  useEffect(() => {
    if (!open) return
    let dispose: () => void = () => undefined
    void client.listenHotkey((id) => void capture(id)).then((next) => {
      dispose = next
    })
    return () => dispose()
  }, [capture, client, open])

  useEffect(() => {
    if (!open || !sessionId || !continuousScan) return
    let disposed = false
    let probing = false

    const probe = async () => {
      if (disposed || probing || captureInFlight.current) return
      probing = true
      try {
        const result = await client.probe(sessionId)
        if (disposed || result.sessionId !== sessionId) return
        setScanPhase(result.phase)
        setScanError(null)
        if (result.shouldCapture) {
          await capture(sessionId)
        }
      } catch (error) {
        if (disposed) return
        const message = error instanceof Error ? error.message : String(error)
        setScanError(message)
        setScanPhase("error")
        setContinuousScan(false)
        toast.error(message)
      } finally {
        probing = false
      }
    }

    void probe()
    const timer = window.setInterval(() => void probe(), 250)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [capture, client, continuousScan, open, sessionId])

  useEffect(() => () => {
    if (sessionId) void client.cancel(sessionId)
  }, [client, sessionId])

  const start = async () => {
    setBusy(true)
    try {
      const result = await client.begin(windowId || undefined, muted)
      setSessionId(result.sessionId)
      setSnapshot(parseInventorySnapshot(result.snapshot))
      setScanPhase(continuousScan ? "waiting" : "idle")
      setScanError(null)
      toast.success(
        continuousScan
          ? "连续扫描已开启，手动滚动后停稳即可自动采集"
          : "扫描已开启，可使用按钮或 Ctrl+Shift+F8 采集",
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const updateTab = (
    tab: "normal" | "craft",
    update: (
      current: TianGongInventorySnapshotV1[typeof tab],
    ) => TianGongInventorySnapshotV1[typeof tab],
  ) => setSnapshot((current) => ({ ...current, [tab]: update(current[tab]) }))

  const updateItem = (
    tab: "normal" | "craft",
    index: number,
    patch: Partial<ScannedStone>,
  ) =>
    updateTab(tab, (current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item),
      completed: current.reportedCount === current.items.length,
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

  const windowOptions = windows.map((window) => ({
    id: window.windowId,
    label: `${window.title.trim()}${window.minimized ? "（已最小化）" : ""}`,
  }))

  const renderItems = (tab: "normal" | "craft") => {
    const items = snapshot[tab].items
    if (items.length === 0) {
      return (
        <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-lg bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
            <ScanLine className="size-7" />
          </span>
          <p className="mt-4 text-sm font-semibold text-[var(--app-text)]">
            尚未采集{tab === "normal" ? "机巧石" : "匠心石"}页签
          </p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--app-text-muted)]">
            在游戏中打开对应页签，手动滚动并保留至少一行重叠，画面停稳后会自动采集。
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-2.5 p-3">
        {items.map((item, index) => (
          <ScanItemCard
            key={item.id}
            index={index}
            item={item}
            onDelete={() =>
              updateTab(tab, (current) => ({
                ...current,
                items: current.items.filter((_, itemIndex) => itemIndex !== index),
                completed: false,
              }))}
            onUpdate={(patch) => updateItem(tab, index, patch)}
          />
        ))}
      </div>
    )
  }

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Trigger aria-hidden className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center">
          <Modal.Dialog
            className="inventory-scan-modal flex h-[min(780px,calc(100vh-24px))] w-[min(1360px,calc(100vw-24px))] max-w-none flex-col overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[0_24px_70px_rgba(15,23,42,0.28)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.58)]"
            data-testid="inventory-scan-modal"
          >
            <Modal.Header
              className="relative flex h-[60px] shrink-0 flex-row items-center justify-start gap-3 bg-[var(--app-surface)] px-5 py-0"
              data-testid="inventory-scan-header"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <ScanLine className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <Modal.Heading className="text-[16px] font-semibold leading-5 text-[var(--app-text)]">
                  游戏库存扫描核对
                </Modal.Heading>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-[var(--app-text-muted)]">
                  仅窗口捕获与本地 OCR，不读取游戏内存，不向游戏发送输入
                </p>
              </div>
              <Chip
                className={`mr-8 ${
                  sessionId
                    ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                    : "bg-[var(--app-control)] text-[var(--app-text-muted)]"
                }`}
                data-testid="inventory-scan-session-status"
                size="sm"
                variant="soft"
              >
                {sessionId ? "扫描会话进行中" : "等待开始"}
              </Chip>
              <Modal.CloseTrigger aria-label="关闭库存扫描" />
            </Modal.Header>

            <Modal.Body className="min-h-0 flex-1 overflow-hidden bg-[var(--app-bg)] p-3">
              <div className="grid h-full min-h-0 grid-cols-[278px_minmax(0,1fr)_270px] overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_10px_30px_rgba(31,45,61,0.10)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
                <aside className="min-h-0 overflow-y-auto border-r border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                  <Surface className="rounded-md border border-[color-mix(in_srgb,var(--app-accent)_35%,var(--app-border))] bg-[var(--app-accent-soft)] p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--app-surface)] text-[var(--app-accent)] shadow-sm">
                        <Gamepad2 className="size-4" />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--app-text)]">
                          请打开个人游戏角色的天工机巧盘页面
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-[var(--app-text-muted)]">
                          进入机巧石库存，并确保页签、库存数量和卡片列表完整可见。
                        </p>
                      </div>
                    </div>
                  </Surface>

                  <div className="mt-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold text-[var(--app-text)]">
                      游戏窗口
                    </h2>
                    <Button
                      aria-label="刷新游戏窗口"
                      className="size-8 min-w-8 rounded-md"
                      isDisabled={!!sessionId}
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onPress={() => void refreshWindows(true)}
                    >
                      <RefreshCw className={`size-4 ${loadingWindows ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <ScannerSelect
                      label="游戏窗口"
                      options={windowOptions}
                      value={windowId}
                      onChange={setWindowId}
                    />
                  </div>
                  {windows.length === 0 && (
                    <div className="mt-2 flex gap-2 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800 dark:bg-amber-950/25 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>未检测到游戏窗口，程序会每 3 秒自动重试，也可以点击刷新。</span>
                    </div>
                  )}
                  {selectedWindow?.minimized && (
                    <p className="mt-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                      游戏窗口已最小化，请先恢复窗口再开始扫描。
                    </p>
                  )}

                  <Surface className="mt-4 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3">
                    <Switch
                      aria-label="连续扫描"
                      className="w-full"
                      isSelected={continuousScan}
                      onChange={(enabled) => {
                        setContinuousScan(enabled)
                        setScanPhase(enabled && sessionId ? "waiting" : "idle")
                        setScanError(null)
                      }}
                    >
                      <Switch.Content className="flex w-full items-center gap-2">
                        <ScanLine className="size-4 text-[var(--app-accent)]" />
                        <span className="flex-1 text-[13px] font-semibold text-[var(--app-text)]">
                          连续扫描
                        </span>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[var(--app-text-muted)]">
                        手动滚动，停稳约 0.35 秒后自动采集
                      </span>
                      <Chip
                        className={scanPhase === "error"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                          : "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"}
                        size="sm"
                        variant="soft"
                      >
                        {scanPhaseLabels[scanPhase]}
                      </Chip>
                    </div>
                    {scanError && (
                      <p className="mt-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                        {scanError}
                      </p>
                    )}
                    <p className="mt-2 flex items-center gap-2 text-[11px] leading-5 text-[var(--app-text-muted)]">
                      <Keyboard className="size-3.5 shrink-0" />
                      Ctrl+Shift+F8 仍可用于手动补采
                    </p>
                  </Surface>

                  <Button
                    className="editor-save-button mt-4 h-10 w-full rounded-md font-semibold"
                    isDisabled={
                      busy ||
                      !!sessionId ||
                      !windowId ||
                      selectedWindow?.minimized === true
                    }
                    variant="primary"
                    onPress={() => void start()}
                  >
                    <ScanLine className="size-4" />
                    开启扫描
                  </Button>
                  <Button
                    className="mt-2 h-10 w-full rounded-md"
                    isDisabled={!sessionId || busy}
                    variant="outline"
                    onPress={() => sessionId && void capture(sessionId)}
                  >
                    {busy
                      ? <RefreshCw className="size-4 animate-spin" />
                      : <ScanLine className="size-4" />}
                    {busy ? "正在识别" : "手动补采当前页"}
                  </Button>

                  <Switch
                    aria-label="扫描提示音"
                    className="mt-3 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3"
                    isSelected={!muted}
                    onChange={(enabled) => setMuted(!enabled)}
                  >
                    <Switch.Content className="flex w-full items-center gap-2 text-[12px] font-medium text-[var(--app-text)]">
                      {muted
                        ? <VolumeX className="size-4 text-[var(--app-text-muted)]" />
                        : <Volume2 className="size-4 text-[var(--app-accent)]" />}
                      <span className="flex-1">扫描提示音</span>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>

                  <div className="mt-4 space-y-2">
                    {(["normal", "craft"] as const).map((tab) => {
                      const label = tab === "normal" ? "机巧石总数" : "匠心石总数"
                      return (
                        <div
                          key={tab}
                          className="flex items-center justify-between rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2"
                        >
                          <div>
                            <p className="text-[12px] font-medium text-[var(--app-text)]">
                              {label}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[var(--app-text-muted)]">
                              已采集 {snapshot[tab].items.length}
                            </p>
                          </div>
                          <ReportedCountField
                            label={label}
                            value={snapshot[tab].reportedCount}
                            onChange={(reportedCount) =>
                              updateTab(tab, (current) => ({
                                ...current,
                                reportedCount,
                                completed: reportedCount === current.items.length,
                              }))}
                          />
                        </div>
                      )
                    })}
                  </div>
                </aside>

                <main className="min-w-0 overflow-hidden bg-[var(--app-surface-muted)]">
                  <Tabs
                    className="inventory-scan-tabs flex h-full min-h-0 flex-col"
                    selectedKey={selectedTab}
                    variant="secondary"
                    onSelectionChange={(key) =>
                      setSelectedTab(String(key) as "normal" | "craft")}
                  >
                    <div
                      className="flex h-[52px] shrink-0 items-center bg-[var(--app-surface)] px-4"
                      data-testid="inventory-scan-tabbar"
                    >
                      <Tabs.ListContainer
                        className="w-[330px] shrink-0"
                      >
                        <Tabs.List
                          aria-label="库存页签"
                          className="grid w-full grid-cols-2 rounded-md bg-[var(--app-control)] p-1"
                        >
                          {(["normal", "craft"] as const).map((tab) => (
                            <Tabs.Tab
                              key={tab}
                              className="h-9 justify-center gap-2 rounded-[5px] text-[12px]"
                              id={tab}
                            >
                              <span>{tab === "normal" ? "机巧石" : "匠心石"}</span>
                              <Chip size="sm" variant="soft">
                                {snapshot[tab].items.length}/{snapshot[tab].reportedCount ?? "?"}
                              </Chip>
                              <Tabs.Indicator />
                            </Tabs.Tab>
                          ))}
                        </Tabs.List>
                      </Tabs.ListContainer>
                      <Button
                        className="ml-auto h-9 shrink-0 rounded-md"
                        data-testid="inventory-scan-add-item"
                        size="sm"
                        variant="outline"
                        onPress={addItem}
                      >
                        <Plus className="size-3.5" />
                        手动新增
                      </Button>
                    </div>
                    <Tabs.Panel
                      className="m-0 min-h-0 flex-1 overflow-y-auto p-0"
                      id="normal"
                    >
                      {renderItems("normal")}
                    </Tabs.Panel>
                    <Tabs.Panel
                      className="m-0 min-h-0 flex-1 overflow-y-auto p-0"
                      id="craft"
                    >
                      {renderItems("craft")}
                    </Tabs.Panel>
                  </Tabs>
                </main>

                <aside className="min-h-0 overflow-y-auto border-l border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-[13px] font-semibold text-[var(--app-text)]">
                        库存汇总
                      </h2>
                      <p className="text-[10px] text-[var(--app-text-muted)]">
                        应用前必须完成两页核对
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {Object.entries(counts).map(([shape, count]) => (
                      <div
                        key={shape}
                        className="flex h-11 items-center justify-between rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 text-[13px] shadow-sm"
                      >
                        <span className="text-[var(--app-text-muted)]">
                          {shapeLabels[shape as ScannedStoneShape]}
                        </span>
                        <strong className="text-base text-[var(--app-text)]">{count}</strong>
                      </div>
                    ))}
                    <div className="flex h-11 items-center justify-between rounded-md border border-[color-mix(in_srgb,#d6b85f_48%,var(--app-border))] bg-[color-mix(in_srgb,#d6b85f_9%,var(--app-surface))] px-3 text-[13px] shadow-sm">
                      <span className="text-[var(--app-text-muted)]">匠心石</span>
                      <strong className="text-base text-[var(--app-text)]">
                        {snapshot.craft.items.length}
                      </strong>
                    </div>
                  </div>

                  <Surface
                    className={`mt-4 rounded-md border p-3 text-[11px] leading-5 ${
                      completeness.canApply
                        ? "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300"
                        : "border-amber-400/50 bg-amber-50 text-amber-800 dark:bg-amber-950/25 dark:text-amber-300"
                    }`}
                  >
                    {completeness.canApply
                      ? (
                        <div className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                          <span>两页清单完整且已核对，可以应用库存。</span>
                        </div>
                      )
                      : (
                        <div className="flex gap-2">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                          <span>
                            低置信度 {completeness.unresolvedItems} 项，未知形状 {completeness.unknownShapes} 项；
                            {completeness.countMismatch ? "库存数量不一致。" : "请完成两页数量核对。"}
                          </span>
                        </div>
                      )}
                  </Surface>

                  <div className="mt-4 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3 text-[11px] leading-5 text-[var(--app-text-muted)]">
                    原始截图和卡片裁剪只保存在当前进程内存中，确认、取消或退出后立即释放。
                  </div>
                </aside>
              </div>
            </Modal.Body>

            <Modal.Footer
              className="flex h-[50px] shrink-0 items-center gap-2 bg-[var(--app-surface)] px-5 py-0"
              data-testid="inventory-scan-footer"
            >
              <p className="mr-auto text-[11px] text-[var(--app-text-muted)]">
                {sessionId ? "扫描进行中，关闭窗口会取消本次会话" : "确认清单后再一次性写入求解器库存"}
              </p>
              <Button
                className="h-9 rounded-md px-5"
                size="sm"
                variant="outline"
                onPress={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                className="editor-save-button h-9 rounded-md px-5"
                isDisabled={!completeness.canApply}
                size="sm"
                variant="primary"
                onPress={() => void apply()}
              >
                <Check className="size-3.5" />
                应用库存
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
