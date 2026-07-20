import Logic from "logic-solver-plus"
import {
  ORDINARY_PIECE_KINDS,
  type PieceKind,
  type PiecePlacement,
  type TianGongConfigV1,
  type TianGongSolution,
  type TianGongSolveOptions,
  type TianGongSolveResult,
} from "./types"
import {
  cellKey,
  compareCells,
  generatePlacements,
} from "./board"

const PIECE_ORDER: PieceKind[] = [
  "craft",
  "square",
  "l",
  "t",
  "line",
  "j",
]

function result(
  status: TianGongSolveResult["status"],
  reason: TianGongSolveResult["reason"],
  startedAt: number,
  now: () => number,
  solutions: TianGongSolution[] = [],
  truncated: TianGongSolveResult["truncated"] = null,
): TianGongSolveResult {
  return {
    status,
    reason,
    solutions,
    truncated,
    durationMs: Math.max(0, now() - startedAt),
  }
}

function placementKey(placement: PiecePlacement) {
  return `${placement.piece}:${placement.cells.map(cellKey).join(";")}`
}

function createSolution(placements: PiecePlacement[]): TianGongSolution {
  const sorted = placements
    .map((placement) => ({
      piece: placement.piece,
      cells: [...placement.cells].sort(compareCells),
    }))
    .sort((left, right) =>
      PIECE_ORDER.indexOf(left.piece) - PIECE_ORDER.indexOf(right.piece)
      || placementKey(left).localeCompare(placementKey(right))
    )
  return {
    key: sorted.map(placementKey).join("|"),
    placements: sorted,
  }
}

export async function solveTianGong(
  config: TianGongConfigV1,
  options: TianGongSolveOptions = {},
): Promise<TianGongSolveResult> {
  const now = options.now ?? (() => performance.now())
  const startedAt = now()
  const deadline = startedAt + (options.maxDurationMs ?? 20_000)
  const shouldCancel = options.shouldCancel ?? (() => false)

  if (shouldCancel()) {
    return result("cancelled", "cancelled", startedAt, now)
  }
  if (config.activeCells.length === 0) {
    return result("invalid", "empty-board", startedAt, now)
  }
  if (config.activeCells.length % 4 !== 0) {
    return result("invalid", "cell-count", startedAt, now)
  }

  const availablePieces = 1 + ORDINARY_PIECE_KINDS.reduce(
    (sum, piece) => sum + config.inventory[piece],
    0,
  )
  if (availablePieces * 4 < config.activeCells.length) {
    return result("invalid", "inventory-area", startedAt, now)
  }

  const placements: PiecePlacement[] = [
    ...generatePlacements("craft", config.activeCells),
    ...ORDINARY_PIECE_KINDS.flatMap((piece) =>
      config.inventory[piece] > 0
        ? generatePlacements(piece, config.activeCells)
        : []
    ),
  ]
  const craftPlacements = placements.filter(({ piece }) => piece === "craft")
  if (craftPlacements.length === 0) {
    return result("unsolved", "no-solution", startedAt, now)
  }

  const variables = placements.map((_, index) => `placement:${index}`)
  const solver = new Logic.Solver()
  await solver.initialize()

  for (const cell of config.activeCells) {
    const coveringVariables = placements.flatMap((placement, index) =>
      placement.cells.some((candidate) => cellKey(candidate) === cellKey(cell))
        ? [variables[index]]
        : []
    )
    if (coveringVariables.length === 0) {
      return result("unsolved", "no-solution", startedAt, now)
    }
    solver.require(Logic.exactlyOne(coveringVariables))
  }

  solver.require(Logic.exactlyOne(
    placements.flatMap((placement, index) =>
      placement.piece === "craft" ? [variables[index]] : []
    ),
  ))

  for (const piece of ORDINARY_PIECE_KINDS) {
    const pieceVariables = placements.flatMap((placement, index) =>
      placement.piece === piece ? [variables[index]] : []
    )
    if (pieceVariables.length > 0) {
      solver.require(Logic.lessThanOrEqual(
        Logic.sum(...pieceVariables),
        Logic.constantBits(config.inventory[piece]),
      ))
    }
  }

  const uniqueSolutions = new Map<string, TianGongSolution>()
  let truncated: TianGongSolveResult["truncated"] = null
  let timedOut = false

  while (uniqueSolutions.size <= config.maxSolutions) {
    if (shouldCancel()) {
      return result(
        "cancelled",
        "cancelled",
        startedAt,
        now,
        [...uniqueSolutions.values()],
      )
    }
    if (now() >= deadline) {
      truncated = "time-limit"
      timedOut = true
      break
    }

    const model = solver.solve()
    if (!model) break

    const selectedVariables = model.getTrueVars().filter((name) =>
      name.startsWith("placement:")
    )
    const selectedPlacements = selectedVariables.map((name) =>
      placements[Number(name.slice("placement:".length))]
    )
    const solution = createSolution(selectedPlacements)
    uniqueSolutions.set(solution.key, solution)
    options.onProgress?.([solution])

    solver.forbid(Logic.and(selectedVariables))
  }

  const solutions = [...uniqueSolutions.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
  if (solutions.length > config.maxSolutions) {
    solutions.length = config.maxSolutions
    truncated = "solution-limit"
  }

  return solutions.length > 0
    ? result("solved", "done", startedAt, now, solutions, truncated)
    : timedOut
      ? result("cancelled", "timeout", startedAt, now, [], "time-limit")
    : result("unsolved", "no-solution", startedAt, now)
}
