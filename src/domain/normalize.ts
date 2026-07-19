import { expandAttributeCombo } from "./attributes"
import {
  BASE_ATTRIBUTES,
  type DropDataset,
  type RawDataset,
} from "./types"

export { expandAttributeCombo } from "./attributes"

function stableId(prefix: string, value: string, index: number): string {
  const slug = value.trim().toLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")
  return `${prefix}-${slug || "item"}-${index + 1}`
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
        slot: rawEntry.slot,
        attributeCombo: rawEntry.attributeCombo,
        expandedAttributes: (rawEntry.expandedAttributes?.filter((attribute): attribute is typeof BASE_ATTRIBUTES[number] =>
          BASE_ATTRIBUTES.includes(attribute as typeof BASE_ATTRIBUTES[number]),
        ) ?? expandAttributeCombo(rawEntry.attributeCombo)),
        weight: rawEntry.weight,
        verified: rawEntry.verified ?? false,
      })),
    })),
  }))

  const slots = input.slots?.length
    ? [...new Set(input.slots)]
    : [...new Set(dungeons.flatMap((dungeon) => dungeon.treasures.flatMap((treasure) => treasure.entries.map((entry) => entry.slot))))]

  return {
    schemaVersion: 2,
    attributes: [...BASE_ATTRIBUTES],
    slots,
    dungeons,
  }
}
