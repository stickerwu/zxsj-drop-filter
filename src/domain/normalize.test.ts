import { describe, expect, it } from "vitest"
import { expandAttributeCombo, normalizeDataset } from "./normalize"

describe("attribute normalization", () => {
  it("expands a combined combo into base attributes", () => {
    expect(expandAttributeCombo("会专")).toEqual(["会心", "专精"])
  })

  it("preserves row identity and fills stable defaults", () => {
    const result = normalizeDataset({
      schemaVersion: 2,
      attributes: ["会心", "专精", "调息", "元御"],
      slots: ["衣服"],
      dungeons: [{
        name: "斩恨踏蜚境",
        treasures: [{
          name: "致知",
          entries: [{ slot: "衣服", attributeCombo: "会专", weight: 1 }],
        }],
      }],
    })
    expect(result.dungeons[0].treasures[0].entries[0]).toMatchObject({
      id: expect.any(String),
      expandedAttributes: ["会心", "专精"],
      verified: false,
    })
  })
})
