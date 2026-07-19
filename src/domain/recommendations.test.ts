import { describe, expect, it } from "vitest"
import { normalizeDataset } from "./normalize"
import { recommendTreasures } from "./recommendations"

describe("treasure recommendations", () => {
  it("sorts by best probability then average probability", () => {
    const dataset = normalizeDataset({
      schemaVersion: 2,
      attributes: ["会心", "专精", "调息", "元御"],
      slots: ["衣服"],
      dungeons: [
        {
          name: "甲副本",
          treasures: [
            { name: "低概率", entries: [{ slot: "衣服", attributeCombo: "会心", weight: 1 }, { slot: "衣服", attributeCombo: "专精", weight: 3 }] },
            { name: "高概率", entries: [{ slot: "衣服", attributeCombo: "会心", weight: 3 }, { slot: "衣服", attributeCombo: "专精", weight: 1 }] },
          ],
        },
      ],
    })
    const [first] = recommendTreasures(dataset, {
      attributes: ["会心"],
      mode: "any",
      slots: [],
      dungeons: [],
    })
    expect(first.treasureName).toBe("高概率")
    expect(first.bestProbability).toBe(0.75)
  })
})
