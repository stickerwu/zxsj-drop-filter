import { describe, expect, it } from "vitest"
import { createDefaultTianGongConfig } from "./config"
import { solveTianGong } from "./solver"
import type { Cell } from "./types"

const cells = (...values: Array<[number, number]>): Cell[] =>
  values.map(([row, column]) => ({ row, column }))

describe("tiangong solver", () => {
  it("requires exactly one craft stone", async () => {
    const config = {
      ...createDefaultTianGongConfig(),
      activeCells: cells([1, 0], [1, 1], [2, 0], [2, 1]),
      inventory: { square: 0, l: 0, t: 0, line: 0, j: 0 },
    }

    const result = await solveTianGong(config)

    expect(result.status).toBe("solved")
    expect(result.solutions).toHaveLength(1)
    expect(result.solutions[0].placements).toEqual([
      expect.objectContaining({ piece: "craft" }),
    ])
  })

  it("honors inventory limits while filling every active cell", async () => {
    const config = {
      ...createDefaultTianGongConfig(),
      activeCells: cells(
        [1, 0], [1, 1], [1, 2], [1, 3],
        [2, 0], [2, 1], [2, 2], [2, 3],
      ),
      inventory: { square: 1, l: 0, t: 0, line: 0, j: 0 },
      maxSolutions: 10,
    }

    const result = await solveTianGong(config)

    expect(result.status).toBe("solved")
    expect(result.solutions).toHaveLength(2)
    expect(result.solutions.every((solution) =>
      solution.placements.filter(({ piece }) => piece === "square").length === 1
    )).toBe(true)
  })

  it("reports invalid and unsatisfied configurations", async () => {
    const invalid = await solveTianGong({
      ...createDefaultTianGongConfig(),
      activeCells: cells([1, 0], [1, 1], [1, 2]),
    })
    const unsatisfied = await solveTianGong({
      ...createDefaultTianGongConfig(),
      activeCells: cells([1, 0], [1, 1], [1, 2], [1, 3]),
      inventory: { square: 0, l: 0, t: 0, line: 1, j: 0 },
    })

    expect(invalid).toMatchObject({ status: "invalid", reason: "cell-count" })
    expect(unsatisfied).toMatchObject({ status: "unsolved", reason: "no-solution" })
  })

  it("limits, deduplicates, and deterministically orders solutions", async () => {
    const config = {
      ...createDefaultTianGongConfig(),
      activeCells: cells(
        [1, 0], [1, 1], [1, 2], [1, 3],
        [2, 0], [2, 1], [2, 2], [2, 3],
      ),
      inventory: { square: 1, l: 0, t: 0, line: 0, j: 0 },
      maxSolutions: 1,
    }

    const first = await solveTianGong(config)
    const second = await solveTianGong(config)

    expect(first.truncated).toBe("solution-limit")
    expect(first.solutions).toHaveLength(1)
    expect(second.solutions).toEqual(first.solutions)
  })

  it("can be cancelled before solving", async () => {
    const result = await solveTianGong(createDefaultTianGongConfig(), {
      shouldCancel: () => true,
    })

    expect(result).toMatchObject({ status: "cancelled", reason: "cancelled" })
  })

  it("reports a time limit before entering an unbounded search", async () => {
    const result = await solveTianGong(createDefaultTianGongConfig(), {
      maxDurationMs: 0,
      now: () => 100,
    })

    expect(result).toMatchObject({
      status: "cancelled",
      reason: "timeout",
      truncated: "time-limit",
    })
  })
})
