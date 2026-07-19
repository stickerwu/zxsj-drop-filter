import { z } from "zod"
import { sha256 } from "@noble/hashes/sha2.js"
import { deflate, inflate } from "pako"
import { normalizeDataset, normalizeLegacyDataset } from "./normalize"
import type { DropDataset, LegacyDataset, ParseResult, RawDataset } from "./types"

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

const legacyDatasetSchema = z.object({
  version: z.number(),
  dungeons: z.array(z.string()),
  baojian: z.array(z.string()),
  slots: z.array(z.string()),
  attributes: z.array(z.string()),
  source_note: z.string().optional(),
  tables: z.array(z.object({
    dungeon: z.string(),
    baojian: z.string(),
    note: z.string().optional(),
    items: z.array(z.object({
      name: z.string(),
      slot: z.string(),
      weight: z.number().positive(),
      quality: z.string().optional(),
      note: z.string().optional(),
      tags: z.array(z.string()).optional(),
      attrs: z.array(z.object({ name: z.string() })).optional(),
    })),
  })),
})

const APP_SALT = new TextEncoder().encode("zx-mystic-drop-v1")
const APP_TOKEN = new TextEncoder().encode("zhuxian-s3-mystic-core-2026")
const SEED = sha256(new Uint8Array([...APP_SALT, ...APP_TOKEN]))

function makeKeystream(length: number): Uint8Array {
  const output = new Uint8Array(length)
  let offset = 0
  let counter = 0
  while (offset < length) {
    const counterBytes = new Uint8Array(4)
    new DataView(counterBytes.buffer).setUint32(0, counter, false)
    const block = sha256(new Uint8Array([...SEED, ...counterBytes]))
    output.set(block.subarray(0, Math.min(block.length, length - offset)), offset)
    offset += block.length
    counter += 1
  }
  return output
}

function xorBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  return Uint8Array.from(left, (value, index) => value ^ right[index])
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function parseJsonData(input: string): ParseResult {
  const value: unknown = JSON.parse(input)
  if (typeof value === "object" && value !== null && "tables" in value) {
    const legacy = legacyDatasetSchema.parse(value) as LegacyDataset
    return { dataset: normalizeLegacyDataset(legacy), warnings: [] }
  }
  const parsed = rawDatasetSchema.parse(value) as RawDataset
  return { dataset: normalizeDataset(parsed), warnings: [] }
}

export function serializeJsonData(dataset: DropDataset): string {
  return JSON.stringify(dataset, null, 2)
}

export function parseZxData(input: Uint8Array): ParseResult {
  const envelope = JSON.parse(new TextDecoder().decode(input).replace(/^\uFEFF/, "").trim()) as { v: number; alg: string; data: string }
  if (envelope.v !== 1 || envelope.alg !== "zx1") {
    throw new Error("不支持的 .zx 数据版本")
  }
  const xored = base64ToBytes(envelope.data)
  const compressed = xorBytes(xored, makeKeystream(xored.length))
  return parseJsonData(new TextDecoder().decode(inflate(compressed)))
}

export function serializeZxData(dataset: DropDataset): Uint8Array {
  const legacy = {
    version: 5,
    dungeons: dataset.dungeons.map((dungeon) => dungeon.name),
    baojian: [...new Set(dataset.dungeons.flatMap((dungeon) => dungeon.treasures.map((treasure) => treasure.name)))],
    slots: dataset.slots,
    attributes: [...dataset.attributes],
    source_note: "诛仙高手秘境掉落软件：借鉴诛仙世界-秘境掉落筛选，并兼容其 drop_tables.zx 数据结构。",
    tables: dataset.dungeons.flatMap((dungeon) => dungeon.treasures.map((treasure) => ({
      dungeon: dungeon.name,
      baojian: treasure.name,
      note: "",
      items: treasure.entries.map((entry) => ({
        name: entry.name ?? `${entry.slot}·${entry.attributeCombo}`,
        slot: entry.slot,
        weight: entry.weight,
        quality: entry.quality ?? "",
        note: entry.note ?? "",
        tags: entry.tags ?? [...entry.expandedAttributes, entry.attributeCombo, ...(entry.verified ? ["verified"] : [])],
        attrs: entry.expandedAttributes.map((name) => ({ name })),
      })),
    }))),
  }
  const raw = new TextEncoder().encode(JSON.stringify(legacy, null, 2))
  const compressed = deflate(raw, { level: 9 })
  const xored = xorBytes(compressed, makeKeystream(compressed.length))
  const envelope = JSON.stringify({ v: 1, alg: "zx1", data: bytesToBase64(xored) })
  return new TextEncoder().encode(envelope)
}
