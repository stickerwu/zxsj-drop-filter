import { describe, expect, it } from "vitest"
import { normalizeDataset } from "./normalize"
import { parseJsonData, serializeJsonData } from "./serialization"

const dataset = normalizeDataset({
  schemaVersion: 2,
  attributes: ["会心", "专精", "调息", "元御"],
  slots: ["衣服"],
  dungeons: [{
    name: "斩恨磨蛰境",
    treasures: [{
      name: "致知",
      entries: [{ slot: "衣服", attributeCombo: "会专", weight: 1 }],
    }],
  }],
})

describe("dataset serialization", () => {
  it("round trips the public JSON format", () => {
    const parsed = parseJsonData(serializeJsonData(dataset))
    expect(parsed.warnings).toEqual([])
    expect(parsed.dataset.dungeons[0].treasures[0].entries[0].attributeCombo).toBe("会专")
  })

  it("rejects invalid non-positive weights", () => {
    expect(() => parseJsonData(JSON.stringify({
      ...dataset,
      dungeons: [{
        ...dataset.dungeons[0],
        treasures: [{
          ...dataset.dungeons[0].treasures[0],
          entries: [{ ...dataset.dungeons[0].treasures[0].entries[0], weight: 0 }],
        }],
      }],
    }))).toThrow()
  })
})
