import { describe, expect, it } from "vitest"
import {
  createEmptyInventorySnapshot,
  inventoryCounts,
  parseInventorySnapshot,
  scanCompleteness,
} from "./inventory"

describe("tiangong inventory snapshots", () => {
  it("creates an empty versioned snapshot", () => {
    const snapshot = createEmptyInventorySnapshot()

    expect(snapshot).toMatchObject({
      version: 1,
      normal: {
        reportedCount: null,
        completed: false,
        items: [],
      },
      craft: {
        reportedCount: null,
        completed: false,
        items: [],
      },
    })
    expect(Date.parse(snapshot.capturedAt)).not.toBeNaN()
  })

  it("parses a strict snapshot and preserves identical stones as separate items", () => {
    const stone = {
      category: "normal" as const,
      shape: "l" as const,
      elementRaw: "火",
      qualityRaw: "良",
      primaryAttributes: [{ raw: "调息+1", confidence: 0.98 }],
      spiritAttributes: [{ raw: "烈火燎原+1", confidence: 0.94 }],
      marks: [],
      confirmed: true,
      confidence: 0.95,
    }
    const parsed = parseInventorySnapshot({
      ...createEmptyInventorySnapshot(),
      normal: {
        reportedCount: 2,
        completed: true,
        items: [
          { ...stone, id: "stone-1" },
          { ...stone, id: "stone-2" },
        ],
      },
    })

    expect(parsed.normal.items).toHaveLength(2)
    expect(parsed.normal.items.map((item) => item.id)).toEqual([
      "stone-1",
      "stone-2",
    ])
  })

  it("rejects duplicate ids and invalid confidence values", () => {
    const snapshot = createEmptyInventorySnapshot()
    const invalidStone = {
      id: "duplicate",
      category: "normal",
      shape: "square",
      elementRaw: null,
      qualityRaw: null,
      primaryAttributes: [],
      spiritAttributes: [],
      marks: [],
      confirmed: false,
      confidence: 2,
    }

    expect(() => parseInventorySnapshot({
      ...snapshot,
      normal: {
        reportedCount: 2,
        completed: false,
        items: [invalidStone, invalidStone],
      },
    })).toThrow(/置信度|重复/)
  })

  it("summarizes ordinary shapes without counting craft or unknown stones", () => {
    const snapshot = parseInventorySnapshot({
      ...createEmptyInventorySnapshot(),
      normal: {
        reportedCount: 4,
        completed: true,
        items: [
          {
            id: "square",
            category: "normal",
            shape: "square",
            elementRaw: null,
            qualityRaw: null,
            primaryAttributes: [],
            spiritAttributes: [],
            marks: [],
            confirmed: true,
            confidence: 1,
          },
          {
            id: "l-1",
            category: "normal",
            shape: "l",
            elementRaw: null,
            qualityRaw: null,
            primaryAttributes: [],
            spiritAttributes: [],
            marks: [],
            confirmed: true,
            confidence: 1,
          },
          {
            id: "l-2",
            category: "normal",
            shape: "l",
            elementRaw: null,
            qualityRaw: null,
            primaryAttributes: [],
            spiritAttributes: [],
            marks: [],
            confirmed: true,
            confidence: 1,
          },
          {
            id: "unknown",
            category: "normal",
            shape: "unknown",
            elementRaw: null,
            qualityRaw: null,
            primaryAttributes: [],
            spiritAttributes: [],
            marks: [],
            confirmed: false,
            confidence: 0.4,
          },
        ],
      },
    })

    expect(inventoryCounts(snapshot)).toEqual({
      square: 1,
      l: 2,
      t: 0,
      line: 0,
      j: 0,
    })
    expect(scanCompleteness(snapshot)).toMatchObject({
      canApply: false,
      unknownShapes: 1,
      unresolvedItems: 1,
      countMismatch: false,
    })
  })

  it("requires matching reported counts and confirmed low-confidence items", () => {
    const snapshot = parseInventorySnapshot({
      ...createEmptyInventorySnapshot(),
      normal: {
        reportedCount: 1,
        completed: true,
        items: [{
          id: "stone",
          category: "normal",
          shape: "t",
          elementRaw: "雷",
          qualityRaw: "良",
          primaryAttributes: [],
          spiritAttributes: [],
          marks: [],
          confirmed: true,
          confidence: 0.7,
        }],
      },
      craft: {
        reportedCount: 0,
        completed: true,
        items: [],
      },
    })

    expect(scanCompleteness(snapshot)).toEqual({
      canApply: true,
      unknownShapes: 0,
      unresolvedItems: 0,
      countMismatch: false,
      incompleteTabs: [],
    })
  })
})
