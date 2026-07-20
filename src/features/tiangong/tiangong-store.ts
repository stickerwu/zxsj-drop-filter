import { create } from "zustand"
import {
  EXISTING_CELLS,
  cellKey,
  compareCells,
} from "./board"
import {
  createDefaultTianGongConfig,
  parseTianGongConfig,
  serializeTianGongConfig,
} from "./config"
import type {
  Cell,
  OrdinaryPieceKind,
  TianGongConfigV1,
  TianGongSolution,
  TianGongSolveResult,
} from "./types"

export const TIANGONG_CONFIG_STORAGE_KEY = "zxsj-toolbox.tiangong.v1"

export type TianGongViewMode = "edit" | "solution"
export type TianGongStoreSolveStatus =
  | "idle"
  | "solving"
  | TianGongSolveResult["status"]

interface TianGongStore {
  config: TianGongConfigV1
  viewMode: TianGongViewMode
  solveStatus: TianGongStoreSolveStatus
  solutions: TianGongSolution[]
  currentSolutionIndex: number
  result: TianGongSolveResult | null
  errorMessage: string | null
  toggleCell: (cell: Cell) => void
  setAllCells: (active: boolean) => void
  setInventory: (piece: OrdinaryPieceKind, value: number) => void
  setMaxSolutions: (value: number) => void
  setViewMode: (mode: TianGongViewMode) => void
  selectSolution: (index: number) => void
  loadConfig: (config: TianGongConfigV1) => void
  resetConfig: () => void
  startSolving: () => void
  appendSolutions: (solutions: TianGongSolution[]) => void
  finishSolving: (result: TianGongSolveResult) => void
  failSolving: (message: string) => void
  invalidateSolutions: () => void
}

const existingCellKeys = new Set(EXISTING_CELLS.map(cellKey))

function readStoredConfig() {
  if (typeof window === "undefined") return createDefaultTianGongConfig()
  const stored = window.localStorage.getItem(TIANGONG_CONFIG_STORAGE_KEY)
  if (!stored) return createDefaultTianGongConfig()
  try {
    return parseTianGongConfig(stored)
  } catch {
    return createDefaultTianGongConfig()
  }
}

function persistConfig(config: TianGongConfigV1) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    TIANGONG_CONFIG_STORAGE_KEY,
    serializeTianGongConfig(config),
  )
}

function clampInteger(value: number, minimum: number, maximum: number) {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : minimum
  return Math.max(minimum, Math.min(maximum, normalized))
}

const clearedSolveState = {
  viewMode: "edit" as const,
  solveStatus: "idle" as const,
  solutions: [] as TianGongSolution[],
  currentSolutionIndex: 0,
  result: null,
  errorMessage: null,
}

export const useTianGongStore = create<TianGongStore>((set, get) => ({
  config: readStoredConfig(),
  ...clearedSolveState,
  toggleCell: (cell) => {
    if (!existingCellKeys.has(cellKey(cell))) return
    const current = get().config.activeCells
    const active = current.some((candidate) => cellKey(candidate) === cellKey(cell))
    const activeCells = (
      active
        ? current.filter((candidate) => cellKey(candidate) !== cellKey(cell))
        : [...current, cell]
    ).sort(compareCells)
    const config = { ...get().config, activeCells }
    persistConfig(config)
    set({ config, ...clearedSolveState })
  },
  setAllCells: (active) => {
    const config = {
      ...get().config,
      activeCells: active ? EXISTING_CELLS.map((cell) => ({ ...cell })) : [],
    }
    persistConfig(config)
    set({ config, ...clearedSolveState })
  },
  setInventory: (piece, value) => {
    const config = {
      ...get().config,
      inventory: {
        ...get().config.inventory,
        [piece]: clampInteger(value, 0, 99),
      },
    }
    persistConfig(config)
    set({ config, ...clearedSolveState })
  },
  setMaxSolutions: (value) => {
    const config = {
      ...get().config,
      maxSolutions: clampInteger(value, 1, 5000),
    }
    persistConfig(config)
    set({ config, ...clearedSolveState })
  },
  setViewMode: (viewMode) => {
    if (viewMode === "solution" && get().solutions.length === 0) return
    set({ viewMode })
  },
  selectSolution: (index) => {
    const length = get().solutions.length
    if (length === 0) return
    set({
      currentSolutionIndex: (index + length) % length,
      viewMode: "solution",
    })
  },
  loadConfig: (input) => {
    const config = parseTianGongConfig(input)
    persistConfig(config)
    set({ config, ...clearedSolveState })
  },
  resetConfig: () => {
    const config = createDefaultTianGongConfig()
    persistConfig(config)
    set({ config, ...clearedSolveState })
  },
  startSolving: () => set({
    solveStatus: "solving",
    solutions: [],
    currentSolutionIndex: 0,
    result: null,
    errorMessage: null,
    viewMode: "edit",
  }),
  appendSolutions: (incoming) => set((state) => {
    const solutions = new Map(state.solutions.map((solution) => [
      solution.key,
      solution,
    ]))
    for (const solution of incoming) solutions.set(solution.key, solution)
    return { solutions: [...solutions.values()] }
  }),
  finishSolving: (result) => set({
    result,
    solveStatus: result.status,
    solutions: result.solutions,
    currentSolutionIndex: 0,
    viewMode: result.solutions.length > 0 ? "solution" : "edit",
    errorMessage: null,
  }),
  failSolving: (message) => set({
    result: {
      status: "error",
      reason: "solver-error",
      solutions: [],
      truncated: null,
      durationMs: 0,
    },
    solveStatus: "error",
    solutions: [],
    currentSolutionIndex: 0,
    viewMode: "edit",
    errorMessage: message,
  }),
  invalidateSolutions: () => set(clearedSolveState),
}))

export function resetTianGongStore() {
  useTianGongStore.setState({
    config: createDefaultTianGongConfig(),
    ...clearedSolveState,
  })
}
