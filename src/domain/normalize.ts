import {
  isFilterAttribute,
  normalizeExpandedAttributes,
} from "./attributes"
import {
  FILTER_ATTRIBUTES,
  type DropDataset,
  type LegacyDataset,
  type RawDataset,
} from "./types"

export { expandAttributeCombo } from "./attributes"

function stableId(prefix: string, value: string, index: number): string {
  const slug = value.trim().toLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")
  return `${prefix}-${slug || "item"}-${index + 1}`
}

function normalizeAttributeCatalog(attributes?: string[]) {
  const normalized = [...new Set((attributes ?? []).filter(isFilterAttribute))]
  return normalized.length ? normalized : [...FILTER_ATTRIBUTES]
}

export function normalizeDataset(input: RawDataset): DropDataset {
  const dungeons = input.dungeons.map((rawDungeon, dungeonIndex) => ({
    id: rawDungeon.id ?? stableId("dungeon", rawDungeon.name, dungeonIndex),
    name: rawDungeon.name,
    treasures: rawDungeon.treasures.map((rawTreasure, treasureIndex) => ({
      id: rawTreasure.id ?? stableId("treasure", rawTreasure.name, treasureIndex),
      name: rawTreasure.name,
      entries: rawTreasure.entries.map((rawEntry, entryIndex) => ({
        id: rawEntry.id ?? `${stableId("entry", rawTreasure.name, treasureIndex)}-${entryIndex + 1}`,
        name: rawEntry.name,
        slot: rawEntry.slot,
        attributeCombo: rawEntry.attributeCombo,
        expandedAttributes: normalizeExpandedAttributes(rawEntry.expandedAttributes, rawEntry.attributeCombo),
        weight: rawEntry.weight,
        verified: rawEntry.verified ?? false,
        quality: rawEntry.quality,
        note: rawEntry.note,
        tags: rawEntry.tags,
      })),
    })),
  }))

  const slots = input.slots?.length
    ? [...new Set(input.slots)]
    : [...new Set(dungeons.flatMap((dungeon) => dungeon.treasures.flatMap((treasure) => treasure.entries.map((entry) => entry.slot))))]

  return {
    schemaVersion: 2,
    attributes: normalizeAttributeCatalog(input.attributes),
    slots,
    dungeons,
  }
}

export function normalizeLegacyDataset(input: LegacyDataset): DropDataset {
  const dungeonMap = new Map<string, { id: string; name: string; treasures: Map<string, { id: string; name: string; entries: DropDataset["dungeons"][number]["treasures"][number]["entries"] }> }>()

  input.tables.forEach((table, tableIndex) => {
    const dungeon = dungeonMap.get(table.dungeon) ?? {
      id: stableId("dungeon", table.dungeon, tableIndex),
      name: table.dungeon,
      treasures: new Map(),
    }
    const treasure = dungeon.treasures.get(table.baojian) ?? {
      id: stableId("treasure", table.baojian, tableIndex),
      name: table.baojian,
      entries: [],
    }
    treasure.entries.push(...table.items.map((item, itemIndex) => {
      const combo = item.name.includes("·") ? item.name.split("·").slice(1).join("·") : item.tags?.find((tag) => tag.length === 2) ?? ""
      const expandedAttributes = normalizeExpandedAttributes(
        item.attrs?.map((attr) => attr.name),
        combo,
      )
      return {
        id: `${stableId("entry", table.baojian, tableIndex)}-${itemIndex + 1}-${treasure.entries.length + 1}`,
        name: item.name,
        slot: item.slot,
        attributeCombo: combo,
        expandedAttributes,
        weight: item.weight,
        verified: item.tags?.includes("verified") ?? false,
        quality: item.quality,
        note: item.note,
        tags: item.tags,
      }
    }))
    dungeon.treasures.set(table.baojian, treasure)
    dungeonMap.set(table.dungeon, dungeon)
  })

  return {
    schemaVersion: 2,
    attributes: normalizeAttributeCatalog(input.attributes),
    slots: [...new Set(input.slots)],
    dungeons: [...dungeonMap.values()].map((dungeon) => ({
      id: dungeon.id,
      name: dungeon.name,
      treasures: [...dungeon.treasures.values()],
    })),
  }
}
