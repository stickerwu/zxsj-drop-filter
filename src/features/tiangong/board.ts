import type {
  Cell,
  OrdinaryPieceKind,
  PieceKind,
  PiecePlacement,
} from "./types"

type ShapeCell = readonly [row: number, column: number]
type Shape = readonly ShapeCell[]

const SHAPES: Record<PieceKind, Shape> = {
  craft: [[0, 0], [0, 1], [1, 0], [1, 1]],
  square: [[0, 0], [0, 1], [1, 0], [1, 1]],
  l: [[0, 0], [1, 0], [2, 0], [2, 1]],
  t: [[0, 0], [0, 1], [0, 2], [1, 1]],
  line: [[0, 0], [0, 1], [0, 2], [0, 3]],
  j: [[0, 0], [1, 0], [2, 0], [2, -1]],
}

export const PIECE_LABELS: Record<PieceKind, string> = {
  craft: "匠心石",
  square: "正方形",
  l: "L 型",
  t: "T 型",
  line: "一字型",
  j: "J 型",
}

export const PIECE_COLORS: Record<PieceKind, string> = {
  craft: "#d6b85f",
  square: "#5f9fd8",
  l: "#77b96a",
  t: "#d87982",
  line: "#9a76d2",
  j: "#55b9aa",
}

export const EXISTING_CELLS: Cell[] = Array.from({ length: 7 }, (_, row) =>
  Array.from({ length: 6 }, (_, column) => ({ row, column })),
).flat().filter(({ row, column }) => row > 0 || (column >= 1 && column <= 4))

export const DEFAULT_ACTIVE_CELLS: Cell[] = EXISTING_CELLS.filter(
  ({ row }) => row >= 1 && row <= 4,
)

export function cellKey({ row, column }: Cell) {
  return `${row},${column}`
}

export function compareCells(left: Cell, right: Cell) {
  return left.row - right.row || left.column - right.column
}

function normalize(shape: Shape): ShapeCell[] {
  const minRow = Math.min(...shape.map(([row]) => row))
  const minColumn = Math.min(...shape.map(([, column]) => column))
  return shape
    .map(([row, column]) => [row - minRow, column - minColumn] as ShapeCell)
    .sort(([leftRow, leftColumn], [rightRow, rightColumn]) =>
      leftRow - rightRow || leftColumn - rightColumn
    )
}

function shapeKey(shape: Shape) {
  return normalize(shape).map(([row, column]) => `${row},${column}`).join(";")
}

function rotate90(shape: Shape): ShapeCell[] {
  return shape.map(([row, column]) => [column, -row])
}

export function getOrientations(piece: PieceKind): ShapeCell[][] {
  const orientations: ShapeCell[][] = []
  const seen = new Set<string>()
  let current: Shape = SHAPES[piece]

  for (let index = 0; index < 4; index += 1) {
    const normalized = normalize(current)
    const key = shapeKey(normalized)
    if (!seen.has(key)) {
      seen.add(key)
      orientations.push(normalized)
    }
    current = rotate90(current)
  }

  return orientations
}

export function generatePlacements(
  piece: PieceKind,
  activeCells: Cell[],
): PiecePlacement[] {
  const active = new Set(activeCells.map(cellKey))
  const placements = new Map<string, PiecePlacement>()

  for (const orientation of getOrientations(piece)) {
    for (const anchor of activeCells) {
      for (const [anchorRow, anchorColumn] of orientation) {
        const offsetRow = anchor.row - anchorRow
        const offsetColumn = anchor.column - anchorColumn
        const cells = orientation
          .map(([row, column]) => ({
            row: row + offsetRow,
            column: column + offsetColumn,
          }))
          .sort(compareCells)

        if (!cells.every((cell) => active.has(cellKey(cell)))) continue

        const key = cells.map(cellKey).join(";")
        placements.set(key, { piece, cells })
      }
    }
  }

  return [...placements.values()].sort((left, right) =>
    left.cells.map(cellKey).join(";").localeCompare(
      right.cells.map(cellKey).join(";"),
    )
  )
}

export function isOrdinaryPiece(
  piece: PieceKind,
): piece is OrdinaryPieceKind {
  return piece !== "craft"
}
