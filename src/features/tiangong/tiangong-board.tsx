import { useEffect, useMemo, useRef } from "react"
import {
  EXISTING_CELLS,
  PIECE_COLORS,
  cellKey,
} from "./board"
import { useTianGongStore } from "./tiangong-store"
import type { Cell, PieceKind } from "./types"

const existingKeys = new Set(EXISTING_CELLS.map(cellKey))

export function TianGongBoard() {
  const config = useTianGongStore((state) => state.config)
  const viewMode = useTianGongStore((state) => state.viewMode)
  const solutions = useTianGongStore((state) => state.solutions)
  const currentSolutionIndex = useTianGongStore(
    (state) => state.currentSolutionIndex,
  )
  const toggleCell = useTianGongStore((state) => state.toggleCell)
  const activeKeys = useMemo(
    () => new Set(config.activeCells.map(cellKey)),
    [config.activeCells],
  )
  const fill = useMemo(() => {
    const cells = new Map<string, PieceKind>()
    if (viewMode !== "solution") return cells
    for (const placement of solutions[currentSolutionIndex]?.placements ?? []) {
      for (const cell of placement.cells) cells.set(cellKey(cell), placement.piece)
    }
    return cells
  }, [currentSolutionIndex, solutions, viewMode])
  const painting = useRef(false)
  const paintActive = useRef(false)
  const pointerToggledCell = useRef<string | null>(null)

  useEffect(() => {
    const stopPainting = () => {
      painting.current = false
    }
    window.addEventListener("pointerup", stopPainting)
    window.addEventListener("pointercancel", stopPainting)
    return () => {
      window.removeEventListener("pointerup", stopPainting)
      window.removeEventListener("pointercancel", stopPainting)
    }
  }, [])

  const paintCell = (cell: Cell, desiredActive: boolean) => {
    const currentlyActive = activeKeys.has(cellKey(cell))
    if (currentlyActive !== desiredActive) toggleCell(cell)
  }

  return (
    <div
      className="tiangong-board"
      data-testid="tiangong-board"
      onContextMenu={(event) => event.preventDefault()}
    >
      {Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 6 }, (_, column) => {
          const cell = { row, column }
          const key = cellKey(cell)
          if (!existingKeys.has(key)) {
            return <span key={key} aria-hidden className="tiangong-cell tiangong-cell-void" />
          }

          const isActive = activeKeys.has(key)
          const piece = fill.get(key)
          const label = `第 ${row + 1} 行第 ${column + 1} 格，${
            piece ? `放置${piece}` : isActive ? "已解锁" : "已锁定"
          }`
          return (
            <button
              key={key}
              aria-label={label}
              className="tiangong-cell"
              data-active={String(isActive)}
              data-piece={piece ?? ""}
              data-testid={piece ? "piece-cell" : undefined}
              disabled={viewMode === "solution"}
              style={piece ? { backgroundColor: PIECE_COLORS[piece] } : undefined}
              type="button"
              onClick={() => {
                if (viewMode !== "edit") return
                if (pointerToggledCell.current === key) {
                  pointerToggledCell.current = null
                  return
                }
                toggleCell(cell)
              }}
              onKeyDown={(event) => {
                if (viewMode !== "edit") return
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  toggleCell(cell)
                }
              }}
              onPointerDown={(event) => {
                if (viewMode !== "edit" || event.button !== 0) return
                event.preventDefault()
                painting.current = true
                paintActive.current = !isActive
                pointerToggledCell.current = key
                paintCell(cell, paintActive.current)
              }}
              onPointerEnter={() => {
                if (viewMode === "edit" && painting.current) {
                  paintCell(cell, paintActive.current)
                }
              }}
            />
          )
        }),
      )}
    </div>
  )
}
