import { describe, expect, it } from "vitest"
import {
  createDefaultTianGongConfig,
  parseTianGongConfig,
  serializeTianGongConfig,
} from "./config"

describe("tiangong config", () => {
  it("creates the documented defaults", () => {
    const config = createDefaultTianGongConfig()

    expect(config.version).toBe(1)
    expect(config.activeCells).toHaveLength(24)
    expect(config.inventory).toEqual({
      square: 2,
      l: 2,
      t: 2,
      line: 2,
      j: 2,
    })
    expect(config.maxSolutions).toBe(50)
  })

  it("round-trips the public JSON format", () => {
    const config = createDefaultTianGongConfig()

    expect(parseTianGongConfig(serializeTianGongConfig(config))).toEqual(config)
  })

  it("accepts game inventory counts up to 999", () => {
    const base = createDefaultTianGongConfig()

    expect(parseTianGongConfig({
      ...base,
      inventory: { ...base.inventory, square: 999 },
    }).inventory.square).toBe(999)
  })

  it("rejects invalid cells, duplicate cells, and out-of-range values", () => {
    const base = createDefaultTianGongConfig()

    expect(() => parseTianGongConfig(JSON.stringify({
      ...base,
      activeCells: [{ row: 0, column: 0 }],
    }))).toThrow(/格子/)
    expect(() => parseTianGongConfig(JSON.stringify({
      ...base,
      activeCells: [base.activeCells[0], base.activeCells[0]],
    }))).toThrow(/重复/)
    expect(() => parseTianGongConfig(JSON.stringify({
      ...base,
      inventory: { ...base.inventory, square: 1000 },
    }))).toThrow(/数量/)
    expect(() => parseTianGongConfig(JSON.stringify({
      ...base,
      maxSolutions: 0,
    }))).toThrow(/方案数/)
  })
})
