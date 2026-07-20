import { z } from "zod"
import type {
  PieceInventory,
  TianGongInventorySnapshotV1,
} from "./types"

const confidenceSchema = z.number().min(0, "置信度不能小于 0").max(1, "置信度不能超过 1")

const textFieldSchema = z.object({
  raw: z.string(),
  confidence: confidenceSchema,
}).strict()

const stoneSchema = z.object({
  id: z.string().min(1, "石头标识不能为空"),
  category: z.enum(["normal", "craft"]),
  shape: z.enum(["square", "l", "t", "line", "j", "craft", "unknown"]),
  elementRaw: z.string().nullable(),
  qualityRaw: z.string().nullable(),
  primaryAttributes: z.array(textFieldSchema),
  spiritAttributes: z.array(textFieldSchema),
  marks: z.array(z.string()),
  confirmed: z.boolean(),
  confidence: confidenceSchema,
}).strict()

const tabSchema = z.object({
  reportedCount: z.number().int().min(0).max(999).nullable(),
  completed: z.boolean(),
  items: z.array(stoneSchema).max(999),
}).strict()

const snapshotSchema = z.object({
  version: z.literal(1),
  capturedAt: z.string().datetime(),
  normal: tabSchema,
  craft: tabSchema,
}).strict().superRefine((snapshot, context) => {
  const ids = [...snapshot.normal.items, ...snapshot.craft.items].map((item) => item.id)
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      message: "扫描清单包含重复石头标识",
    })
  }
})

export function createEmptyInventorySnapshot(): TianGongInventorySnapshotV1 {
  const emptyTab = {
    reportedCount: null,
    completed: false,
    items: [],
  }
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    normal: { ...emptyTab, items: [] },
    craft: { ...emptyTab, items: [] },
  }
}

export function parseInventorySnapshot(
  input: string | unknown,
): TianGongInventorySnapshotV1 {
  let value: unknown = input
  if (typeof input === "string") {
    try {
      value = JSON.parse(input)
    } catch {
      throw new Error("扫描清单不是有效的 JSON")
    }
  }
  const result = snapshotSchema.safeParse(value)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "扫描清单无效")
  }
  return result.data
}

export function inventoryCounts(
  snapshot: TianGongInventorySnapshotV1,
): PieceInventory {
  const counts: PieceInventory = {
    square: 0,
    l: 0,
    t: 0,
    line: 0,
    j: 0,
  }
  for (const item of snapshot.normal.items) {
    if (item.shape in counts) counts[item.shape as keyof PieceInventory] += 1
  }
  return counts
}

export function scanCompleteness(snapshot: TianGongInventorySnapshotV1) {
  const items = [...snapshot.normal.items, ...snapshot.craft.items]
  const unknownShapes = snapshot.normal.items.filter(
    (item) => item.shape === "unknown",
  ).length
  const unresolvedItems = items.filter(
    (item) => item.confidence < 0.8 && !item.confirmed,
  ).length
  const countMismatch = [snapshot.normal, snapshot.craft].some(
    (tab) => tab.reportedCount !== null && tab.reportedCount !== tab.items.length,
  )
  const incompleteTabs = (["normal", "craft"] as const).filter(
    (tab) => !snapshot[tab].completed,
  )
  return {
    canApply:
      unknownShapes === 0 &&
      unresolvedItems === 0 &&
      !countMismatch &&
      incompleteTabs.length === 0,
    unknownShapes,
    unresolvedItems,
    countMismatch,
    incompleteTabs,
  }
}
