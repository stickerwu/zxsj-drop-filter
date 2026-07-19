import { describe, expect, it } from "vitest"
import { normalizeDataset } from "./normalize"
import { parseJsonData, parseZxData, serializeJsonData, serializeZxData } from "./serialization"

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

  it("round trips the real zx1 encryption envelope", () => {
    const parsed = parseZxData(serializeZxData(dataset))
    expect(parsed.dataset.dungeons[0].name).toBe("斩恨磨蛰境")
    expect(parsed.dataset.dungeons[0].treasures[0].entries[0].expandedAttributes).toEqual(["会心", "专精"])
  })

  it("reads the legacy catalog table shape", () => {
    const parsed = parseJsonData(JSON.stringify({
      version: 5,
      dungeons: ["斩恨磨蛰境"],
      baojian: ["致知"],
      slots: ["衣服"],
      attributes: ["会心", "专精"],
      tables: [{
        dungeon: "斩恨磨蛰境",
        baojian: "致知",
        items: [{
          name: "衣服·会专",
          slot: "衣服",
          weight: 2,
          tags: ["会专", "会心", "专精", "verified"],
          attrs: [{ name: "会心" }, { name: "专精" }],
        }],
      }],
    }))
    expect(parsed.dataset.dungeons[0].treasures[0].entries[0]).toMatchObject({
      name: "衣服·会专",
      verified: true,
      expandedAttributes: ["会心", "专精"],
    })
  })
})
