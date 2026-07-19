import { describe, expect, it } from "vitest"
import { recommendTreasures } from "@/domain/recommendations"
import type { FilterState } from "@/domain/types"
import { demoDataset } from "./demo-data"

describe("bundled reference dataset", () => {
  it("keeps the original dungeon names and catalog scale", () => {
    expect(demoDataset.dungeons.map((dungeon) => dungeon.name)).toEqual([
      "护塔破冥幻",
      "斩恨踏蜚境",
      "幻月归心劫",
      "雪岭斩三执",
      "梵境西游录",
    ])
    expect(demoDataset.dungeons.reduce((sum, dungeon) => sum + dungeon.treasures.length, 0)).toBe(40)
    expect(demoDataset.dungeons.reduce(
      (sum, dungeon) => sum + dungeon.treasures.reduce((treasureSum, treasure) => treasureSum + treasure.entries.length, 0),
      0,
    )).toBe(252)
    expect(demoDataset.attributes).toEqual([
      "会心", "专精", "调息", "元御",
      "会专", "会调", "会元", "专调", "专元", "调元",
    ])
  })

  it("matches the reference recommendation for a 专精 filter", () => {
    const filter: FilterState = {
      attributes: ["专精"],
      mode: "any",
      slots: [],
      dungeons: [],
    }
    const recommendations = recommendTreasures(demoDataset, filter)
    expect(recommendations).toHaveLength(8)
    expect(recommendations[0]).toMatchObject({
      treasureName: "致知",
      bestDungeonName: "斩恨踏蜚境",
      bestProbability: 1,
    })
    expect(recommendations.reduce((sum, item) => sum + item.totalMatchedRows, 0)).toBe(126)
  })
})
