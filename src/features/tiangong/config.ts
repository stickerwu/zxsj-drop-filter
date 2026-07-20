import { z } from "zod"
import {
  DEFAULT_ACTIVE_CELLS,
  EXISTING_CELLS,
  cellKey,
  compareCells,
} from "./board"
import type { TianGongConfigV1 } from "./types"

const existingCellKeys = new Set(EXISTING_CELLS.map(cellKey))

const cellSchema = z.object({
  row: z.number().int(),
  column: z.number().int(),
}).strict().refine((cell) => existingCellKeys.has(cellKey(cell)), {
  message: "配置包含不存在的机巧盘格子",
})

const configSchema = z.object({
  version: z.literal(1),
  activeCells: z.array(cellSchema).max(40).superRefine((cells, context) => {
    const keys = cells.map(cellKey)
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "配置包含重复格子",
      })
    }
  }),
  inventory: z.object({
    square: z.number().int().min(0, "机巧石数量不能小于 0").max(999, "机巧石数量不能超过 999"),
    l: z.number().int().min(0, "机巧石数量不能小于 0").max(999, "机巧石数量不能超过 999"),
    t: z.number().int().min(0, "机巧石数量不能小于 0").max(999, "机巧石数量不能超过 999"),
    line: z.number().int().min(0, "机巧石数量不能小于 0").max(999, "机巧石数量不能超过 999"),
    j: z.number().int().min(0, "机巧石数量不能小于 0").max(999, "机巧石数量不能超过 999"),
  }).strict(),
  maxSolutions: z.number().int().min(1, "最多方案数不能小于 1").max(5000, "最多方案数不能超过 5000"),
}).strict()

export function createDefaultTianGongConfig(): TianGongConfigV1 {
  return {
    version: 1,
    activeCells: DEFAULT_ACTIVE_CELLS.map((cell) => ({ ...cell })),
    inventory: {
      square: 2,
      l: 2,
      t: 2,
      line: 2,
      j: 2,
    },
    maxSolutions: 50,
  }
}

export function parseTianGongConfig(input: string | unknown): TianGongConfigV1 {
  let value: unknown = input
  if (typeof input === "string") {
    try {
      value = JSON.parse(input)
    } catch {
      throw new Error("配置文件不是有效的 JSON")
    }
  }

  const result = configSchema.safeParse(value)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "机巧盘配置无效")
  }

  return {
    ...result.data,
    activeCells: [...result.data.activeCells].sort(compareCells),
  }
}

export function serializeTianGongConfig(config: TianGongConfigV1) {
  return `${JSON.stringify(parseTianGongConfig(config), null, 2)}\n`
}
