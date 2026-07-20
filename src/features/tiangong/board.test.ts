import { describe, expect, it } from "vitest"
import {
  DEFAULT_ACTIVE_CELLS,
  EXISTING_CELLS,
  generatePlacements,
  getOrientations,
} from "./board"

describe("tiangong board", () => {
  it("defines the 40-cell board and 24-cell default region", () => {
    expect(EXISTING_CELLS).toHaveLength(40)
    expect(DEFAULT_ACTIVE_CELLS).toHaveLength(24)
    expect(DEFAULT_ACTIVE_CELLS.every(({ row }) => row >= 1 && row <= 4)).toBe(true)
  })

  it("generates rotations without mirrored variants", () => {
    expect(getOrientations("square")).toHaveLength(1)
    expect(getOrientations("l")).toHaveLength(4)
    expect(getOrientations("t")).toHaveLength(4)
    expect(getOrientations("line")).toHaveLength(2)
    expect(getOrientations("j")).toHaveLength(4)

    const lKeys = new Set(getOrientations("l").map((shape) => JSON.stringify(shape)))
    expect(
      getOrientations("j").some((shape) => lKeys.has(JSON.stringify(shape))),
    ).toBe(false)
  })

  it("generates every legal 2x2 placement in the default region", () => {
    expect(generatePlacements("craft", DEFAULT_ACTIVE_CELLS)).toHaveLength(15)
    expect(generatePlacements("square", DEFAULT_ACTIVE_CELLS)).toHaveLength(15)
  })
})
