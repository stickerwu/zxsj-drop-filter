export const ORDINARY_PIECE_KINDS = [
  "square",
  "l",
  "t",
  "line",
  "j",
] as const

export type OrdinaryPieceKind = (typeof ORDINARY_PIECE_KINDS)[number]
export type PieceKind = "craft" | OrdinaryPieceKind

export interface Cell {
  row: number
  column: number
}

export type PieceInventory = Record<OrdinaryPieceKind, number>

export interface TianGongConfigV1 {
  version: 1
  activeCells: Cell[]
  inventory: PieceInventory
  maxSolutions: number
}

export interface PiecePlacement {
  piece: PieceKind
  cells: Cell[]
}

export interface TianGongSolution {
  key: string
  placements: PiecePlacement[]
}

export type TianGongSolveStatus =
  | "solved"
  | "unsolved"
  | "invalid"
  | "cancelled"
  | "error"

export type TianGongSolveReason =
  | "done"
  | "empty-board"
  | "cell-count"
  | "inventory-area"
  | "no-solution"
  | "cancelled"
  | "timeout"
  | "solver-error"

export interface TianGongSolveResult {
  status: TianGongSolveStatus
  reason: TianGongSolveReason
  solutions: TianGongSolution[]
  truncated: "solution-limit" | "time-limit" | null
  durationMs: number
}

export interface TianGongSolveOptions {
  shouldCancel?: () => boolean
  maxDurationMs?: number
  now?: () => number
  onProgress?: (solutions: TianGongSolution[]) => void
}

export type ScannedStoneCategory = "normal" | "craft"
export type ScannedStoneShape = OrdinaryPieceKind | "craft" | "unknown"

export interface ScannedTextField {
  raw: string
  confidence: number
}

export interface ScannedStone {
  id: string
  category: ScannedStoneCategory
  shape: ScannedStoneShape
  elementRaw: string | null
  qualityRaw: string | null
  primaryAttributes: ScannedTextField[]
  spiritAttributes: ScannedTextField[]
  marks: string[]
  confirmed: boolean
  confidence: number
}

export interface ScannedInventoryTab {
  reportedCount: number | null
  completed: boolean
  items: ScannedStone[]
}

export interface TianGongInventorySnapshotV1 {
  version: 1
  capturedAt: string
  normal: ScannedInventoryTab
  craft: ScannedInventoryTab
}
