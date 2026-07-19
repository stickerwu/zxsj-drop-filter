import { z } from "zod"
import { normalizeDataset } from "./normalize"
import type { DropDataset, ParseResult, RawDataset } from "./types"

const rawEntrySchema = z.object({
  id: z.string().optional(),
  slot: z.string().min(1),
  attributeCombo: z.string().min(1),
  expandedAttributes: z.array(z.string()).optional(),
  weight: z.number().positive(),
  verified: z.boolean().optional(),
})

const rawDatasetSchema = z.object({
  schemaVersion: z.number().optional(),
  attributes: z.array(z.string()).optional(),
  slots: z.array(z.string()).optional(),
  dungeons: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    treasures: z.array(z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      entries: z.array(rawEntrySchema),
    })),
  })),
})

export function parseJsonData(input: string): ParseResult {
  const parsed = rawDatasetSchema.parse(JSON.parse(input)) as RawDataset
  return { dataset: normalizeDataset(parsed), warnings: [] }
}

export function serializeJsonData(dataset: DropDataset): string {
  return JSON.stringify(dataset, null, 2)
}

export function parseZxData(input: Uint8Array): ParseResult {
  const envelope = JSON.parse(new TextDecoder().decode(input)) as { v: number; alg: string; data: string }
  if (envelope.v !== 1 || envelope.alg !== "zx1") {
    throw new Error("不支持的 .zx 数据版本")
  }
  const decoded = Uint8Array.from(atob(envelope.data), (char) => char.charCodeAt(0))
  return parseJsonData(new TextDecoder().decode(decoded))
}

export function serializeZxData(dataset: DropDataset): Uint8Array {
  const payload = new TextEncoder().encode(serializeJsonData(dataset))
  let binary = ""
  for (const byte of payload) binary += String.fromCharCode(byte)
  const envelope = JSON.stringify({ v: 1, alg: "zx1", data: btoa(binary) })
  return new TextEncoder().encode(envelope)
}
