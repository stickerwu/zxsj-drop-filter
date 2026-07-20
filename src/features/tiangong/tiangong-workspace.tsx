import { useEffect, useRef } from "react"
import { Button, Chip, NumberField, Surface } from "@heroui/react"
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Info,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Unlock,
  Lock,
} from "lucide-react"
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels"
import {
  ORDINARY_PIECE_KINDS,
  type OrdinaryPieceKind,
  type PieceKind,
} from "./types"
import {
  PIECE_COLORS,
  PIECE_LABELS,
  getOrientations,
} from "./board"
import { useTianGongStore } from "./tiangong-store"
import {
  createTianGongSolverClient,
  type TianGongSolverClient,
} from "./worker-client"
import { TianGongBoard } from "./tiangong-board"

function PanelDivider() {
  return (
    <PanelResizeHandle className="group relative flex w-px shrink-0 items-center justify-center bg-[var(--app-border)] outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 focus-visible:bg-[var(--app-accent)]" />
  )
}

function ShapePreview({
  piece,
  compact = false,
}: {
  piece: PieceKind
  compact?: boolean
}) {
  const shape = getOrientations(piece)[0]
  const rows = Math.max(...shape.map(([row]) => row)) + 1
  const columns = Math.max(...shape.map(([, column]) => column)) + 1
  const cells = new Set(shape.map(([row, column]) => `${row},${column}`))
  const size = compact ? 8 : 10

  return (
    <span
      aria-hidden
      className="grid shrink-0 gap-px"
      style={{
        gridTemplateColumns: `repeat(${columns}, ${size}px)`,
        gridTemplateRows: `repeat(${rows}, ${size}px)`,
      }}
    >
      {Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns)
        const column = index % columns
        const filled = cells.has(`${row},${column}`)
        return (
          <span
            key={`${row},${column}`}
            className="rounded-[1px]"
            style={{
              background: filled ? PIECE_COLORS[piece] : "transparent",
              opacity: filled ? 1 : 0,
            }}
          />
        )
      })}
    </span>
  )
}

function PieceNumberField({ piece }: { piece: OrdinaryPieceKind }) {
  const value = useTianGongStore((state) => state.config.inventory[piece])
  const setInventory = useTianGongStore((state) => state.setInventory)

  return (
    <NumberField
      aria-label={`${PIECE_LABELS[piece]}数量`}
      className="w-[104px]"
      maxValue={99}
      minValue={0}
      value={value}
      onChange={(nextValue) => setInventory(piece, nextValue)}
    >
      <NumberField.Group className="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
        <NumberField.DecrementButton
          aria-label={`减少${PIECE_LABELS[piece]}`}
          className="flex w-7 items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-control)]"
        >
          <Minus className="size-3" />
        </NumberField.DecrementButton>
        <NumberField.Input className="tiangong-number-input min-w-0 flex-1 border-x border-[var(--app-border)] bg-transparent text-center text-sm font-semibold text-[var(--app-text)] outline-none" />
        <NumberField.IncrementButton
          aria-label={`增加${PIECE_LABELS[piece]}`}
          className="flex w-7 items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-control)]"
        >
          <Plus className="size-3" />
        </NumberField.IncrementButton>
      </NumberField.Group>
    </NumberField>
  )
}

function PieceCard({ piece }: { piece: OrdinaryPieceKind }) {
  return (
    <div className="flex h-[58px] items-center gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--app-surface)]">
        <ShapePreview piece={piece} compact />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--app-text)]">
          {PIECE_LABELS[piece]}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">
          占 4 格 · 可旋转
        </p>
      </div>
      <PieceNumberField piece={piece} />
    </div>
  )
}

function solveStatusText() {
  const state = useTianGongStore.getState()
  if (state.solveStatus === "solving") return "正在本地计算方案…"
  if (state.solveStatus === "error") return state.errorMessage ?? "求解失败"
  if (state.result?.status === "invalid") {
    if (state.result.reason === "empty-board") return "请至少解锁 4 个格子"
    if (state.result.reason === "cell-count") return "解锁格数量必须是 4 的倍数"
    if (state.result.reason === "inventory-area") return "现有石头数量不足以填满盘面"
  }
  if (state.result?.status === "unsolved") return "当前区域与库存没有可行填法"
  if (state.result?.status === "solved") {
    const suffix = state.result.truncated ? "，可能还有更多方案" : ""
    return `找到 ${state.solutions.length} 种填法${suffix}`
  }
  return "设置实际解锁区域和拥有数量后开始计算"
}

export function TianGongWorkspace({
  solverClient,
}: {
  solverClient?: TianGongSolverClient
}) {
  const clientRef = useRef<TianGongSolverClient>(
    solverClient ?? createTianGongSolverClient(),
  )
  const config = useTianGongStore((state) => state.config)
  const viewMode = useTianGongStore((state) => state.viewMode)
  const solveStatus = useTianGongStore((state) => state.solveStatus)
  const result = useTianGongStore((state) => state.result)
  const solutions = useTianGongStore((state) => state.solutions)
  const currentSolutionIndex = useTianGongStore(
    (state) => state.currentSolutionIndex,
  )
  const setViewMode = useTianGongStore((state) => state.setViewMode)
  const setAllCells = useTianGongStore((state) => state.setAllCells)
  const resetConfig = useTianGongStore((state) => state.resetConfig)
  const setMaxSolutions = useTianGongStore((state) => state.setMaxSolutions)
  const selectSolution = useTianGongStore((state) => state.selectSolution)
  const previousConfig = useRef(config)

  useEffect(() => () => clientRef.current.dispose(), [])

  useEffect(() => {
    if (previousConfig.current !== config) {
      clientRef.current.cancel()
    }
    previousConfig.current = config
  }, [config])

  const handleSolve = () => {
    const state = useTianGongStore.getState()
    state.startSolving()
    clientRef.current.solve(structuredClone(state.config), {
      onProgress: (incoming) =>
        useTianGongStore.getState().appendSolutions(incoming),
      onComplete: (nextResult) =>
        useTianGongStore.getState().finishSolving(nextResult),
      onError: (message) =>
        useTianGongStore.getState().failSolving(message),
    })
  }

  const statusText = solveStatusText()
  const currentSolution = solutions[currentSolutionIndex]
  const usage = currentSolution?.placements.reduce<Record<string, number>>(
    (counts, placement) => {
      counts[placement.piece] = (counts[placement.piece] ?? 0) + 1
      return counts
    },
    {},
  )

  return (
    <div className="min-h-0 flex-1 p-3">
      <PanelGroup
        direction="horizontal"
        className="h-full overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_36px_rgba(31,45,61,0.14),0_2px_8px_rgba(31,45,61,0.08)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.38)]"
      >
        <Panel defaultSize={21} minSize={18}>
          <aside className="flex h-full min-w-0 flex-col bg-[var(--app-surface)]">
            <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4">
              <span className="flex size-9 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <Grid2X2 className="size-[19px]" />
              </span>
              <div>
                <h1 className="text-[15px] font-semibold">盘面设置</h1>
                <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">
                  {config.activeCells.length} 个解锁格
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 rounded-md bg-[var(--app-control)] p-1">
                <Button
                  className="h-9 rounded-[5px]"
                  data-selected={String(viewMode === "edit")}
                  size="sm"
                  variant={viewMode === "edit" ? "primary" : "ghost"}
                  onPress={() => setViewMode("edit")}
                >
                  编辑格子
                </Button>
                <Button
                  className="h-9 rounded-[5px]"
                  data-selected={String(viewMode === "solution")}
                  isDisabled={solutions.length === 0}
                  size="sm"
                  variant={viewMode === "solution" ? "primary" : "ghost"}
                  onPress={() => setViewMode("solution")}
                >
                  查看方案
                </Button>
              </div>

              <section className="mt-4">
                <h2 className="mb-2 text-[13px] font-semibold">盘面操作</h2>
                <div className="grid gap-2">
                  <Button variant="outline" onPress={() => setAllCells(true)}>
                    <Unlock className="size-4 text-emerald-600" />
                    全部解锁
                  </Button>
                  <Button variant="outline" onPress={() => setAllCells(false)}>
                    <Lock className="size-4 text-slate-500" />
                    全部锁定
                  </Button>
                  <Button variant="outline" onPress={resetConfig}>
                    <RotateCcw className="size-4 text-violet-600" />
                    恢复默认盘面
                  </Button>
                </div>
              </section>

              <Surface className="mt-4 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold">
                  <Info className="size-4 text-[var(--app-accent)]" />
                  编辑方式
                </div>
                <p className="text-[11px] leading-5 text-[var(--app-text-muted)]">
                  点击格子切换状态，也可以按住左键拖动连续刷选。锁定格不会参与求解。
                </p>
              </Surface>
            </div>
          </aside>
        </Panel>
        <PanelDivider />
        <Panel defaultSize={54} minSize={42}>
          <main className="flex h-full min-w-0 flex-col bg-[var(--app-surface)]">
            <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--app-border)] px-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                  <Sparkles className="size-[19px]" />
                </span>
                <div>
                  <h1 className="text-[15px] font-semibold">天工机巧盘</h1>
                  <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">
                    旋转不镜像 · 匠心石固定 1 个
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Chip size="sm" variant="soft">{config.activeCells.length} 格</Chip>
                <Chip size="sm" variant="primary">
                  {viewMode === "edit" ? "编辑盘面" : "查看方案"}
                </Chip>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--app-surface-muted)] p-6">
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_28px_rgba(31,45,61,0.12)] dark:shadow-[0_14px_32px_rgba(0,0,0,0.3)]">
                <TianGongBoard />
              </div>
            </div>

            <div className="min-h-[112px] shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold ${
                    result?.status === "unsolved" || result?.status === "invalid" || solveStatus === "error"
                      ? "text-red-600 dark:text-red-400"
                      : "text-[var(--app-text)]"
                  }`}>
                    {statusText}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[var(--app-text-muted)]">
                    {usage
                      ? Object.entries(usage).map(([piece, count]) => (
                          <span key={piece} className="flex items-center gap-1.5">
                            <i
                              className="size-2.5 rounded-sm"
                              style={{ background: PIECE_COLORS[piece as PieceKind] }}
                            />
                            {PIECE_LABELS[piece as PieceKind]} ×{count}
                          </span>
                        ))
                      : <span>所有计算均在本机完成</span>}
                  </div>
                </div>
                {solutions.length > 0 && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      aria-label="上一个方案"
                      isIconOnly
                      size="sm"
                      variant="outline"
                      onPress={() => selectSolution(currentSolutionIndex - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-16 text-center text-sm font-semibold">
                      {currentSolutionIndex + 1} / {solutions.length}
                    </span>
                    <Button
                      aria-label="下一个方案"
                      isIconOnly
                      size="sm"
                      variant="outline"
                      onPress={() => selectSolution(currentSolutionIndex + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </Panel>
        <PanelDivider />
        <Panel defaultSize={25} minSize={22}>
          <aside className="flex h-full min-w-0 flex-col bg-[var(--app-surface)]">
            <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4">
              <span className="flex size-9 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <Box className="size-[19px]" />
              </span>
              <div>
                <h1 className="text-[15px] font-semibold">机巧石配置</h1>
                <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">
                  填写游戏内实际拥有数量
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex h-[62px] items-center gap-3 rounded-md border border-[color-mix(in_srgb,#d6b85f_50%,var(--app-border))] bg-[color-mix(in_srgb,#d6b85f_9%,var(--app-surface))] px-3 shadow-sm">
                <span className="flex size-10 items-center justify-center rounded-md bg-[var(--app-surface)]">
                  <ShapePreview piece="craft" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">匠心石</p>
                  <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">
                    2×2 正方形 · 占 4 格
                  </p>
                </div>
                <Chip
                  className="bg-[color-mix(in_srgb,#d6b85f_18%,var(--app-surface))] text-[#8a6912] dark:text-[#f0d87f]"
                  size="sm"
                  variant="soft"
                >
                  必放 1 个
                </Chip>
              </div>

              <div className="mt-3 grid gap-2">
                {ORDINARY_PIECE_KINDS.map((piece) => (
                  <PieceCard key={piece} piece={piece} />
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <NumberField
                aria-label="最多求解方案数"
                maxValue={5000}
                minValue={1}
                value={config.maxSolutions}
                onChange={setMaxSolutions}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-semibold">最多求解方案数</span>
                  <span className="text-[11px] text-[var(--app-text-muted)]">1–5000</span>
                </div>
                <NumberField.Group className="flex h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
                  <NumberField.DecrementButton
                    aria-label="减少方案数"
                    className="flex w-9 items-center justify-center hover:bg-[var(--app-control)]"
                  >
                    <Minus className="size-3.5" />
                  </NumberField.DecrementButton>
                  <NumberField.Input className="min-w-0 flex-1 border-x border-[var(--app-border)] bg-transparent text-center font-semibold outline-none" />
                  <NumberField.IncrementButton
                    aria-label="增加方案数"
                    className="flex w-9 items-center justify-center hover:bg-[var(--app-control)]"
                  >
                    <Plus className="size-3.5" />
                  </NumberField.IncrementButton>
                </NumberField.Group>
              </NumberField>
              <Button
                className="mt-3 h-11 w-full font-semibold"
                isDisabled={solveStatus === "solving"}
                variant="primary"
                onPress={handleSolve}
              >
                <Play className="size-4" />
                {solveStatus === "solving" ? "计算中…" : "开始计算"}
              </Button>
            </div>
          </aside>
        </Panel>
      </PanelGroup>
    </div>
  )
}
