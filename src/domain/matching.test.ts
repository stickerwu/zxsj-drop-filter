import { describe, expect, it } from "vitest"
import { expandAttributeCombo } from "./attributes"
import { entryMatches, calculateMatch } from "./matching"
import type { DropEntry, Dungeon, FilterState, Treasure } from "./types"

const entry = (combo: string, slot = "衣服", weight = 1): DropEntry => ({
  id: combo + slot,
  slot,
  attributeCombo: combo,
  expandedAttributes: expandAttributeCombo(combo),
  weight,
  verified: true,
})

const baseFilter: FilterState = {
  attributes: ["专精"],
  mode: "any",
  slots: [],
  dungeons: [],
}

describe("drop matching", () => {
  it("matches an attribute contained in a combined combo", () => {
    expect(entryMatches(entry("会专"), baseFilter)).toBe(true)
  })

  it("matches a selected double-attribute filter as a complete combination", () => {
    expect(entryMatches(entry("会专"), {
      ...baseFilter,
      attributes: ["会专"],
    })).toBe(true)
    expect(entryMatches(entry("会调"), {
      ...baseFilter,
      attributes: ["会专"],
    })).toBe(false)
  })

  it("requires every selected attribute in all mode", () => {
    expect(entryMatches(entry("会专"), {
      ...baseFilter,
      attributes: ["会心", "专精"],
      mode: "all",
    })).toBe(true)
    expect(entryMatches(entry("会心"), {
      ...baseFilter,
      attributes: ["会心", "专精"],
      mode: "all",
    })).toBe(false)
  })

  it("treats empty filters as unrestricted", () => {
    expect(entryMatches(entry("会心"), {
      attributes: [],
      mode: "any",
      slots: [],
      dungeons: [],
    })).toBe(true)
  })

  it("sums matching weights without rounding", () => {
    const treasure: Treasure = {
      id: "zhi-zhi",
      name: "致知",
      entries: [entry("会专", "衣服", 2), entry("会心", "头部", 1)],
    }
    const dungeon: Dungeon = {
      id: "zhan-hen",
      name: "斩恨踏蜚境",
      treasures: [treasure],
    }
    const result = calculateMatch(treasure, dungeon, baseFilter)
    expect(result.totalWeight).toBe(3)
    expect(result.hitWeight).toBe(2)
    expect(result.probability).toBeCloseTo(2 / 3)
    expect(result.matchedRowCount).toBe(1)
  })
})
