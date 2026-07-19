import type {
  DropEntry,
  Dungeon,
  FilterState,
  MatchResult,
  Treasure,
} from "./types"

export function entryMatches(entry: DropEntry, filter: FilterState): boolean {
  if (filter.slots.length > 0 && !filter.slots.includes(entry.slot)) return false
  if (filter.attributes.length === 0) return true

  const expanded = new Set(entry.expandedAttributes)
  if (filter.mode === "all") {
    return filter.attributes.every((attribute) => expanded.has(attribute))
  }
  return filter.attributes.some((attribute) => expanded.has(attribute))
}

export function calculateMatch(
  treasure: Treasure,
  dungeon: Dungeon,
  filter: FilterState,
): MatchResult {
  const totalWeight = treasure.entries.reduce((sum, entry) => sum + entry.weight, 0)
  const matchedEntries = treasure.entries.filter((entry) => entryMatches(entry, filter))
  const hitWeight = matchedEntries.reduce((sum, entry) => sum + entry.weight, 0)
  const probability = totalWeight > 0 ? hitWeight / totalWeight : 0
  const uniqueCombos = new Set(matchedEntries.map((entry) => entry.attributeCombo))

  return {
    treasureId: treasure.id,
    dungeonId: dungeon.id,
    totalWeight,
    hitWeight,
    probability,
    expectedRuns: probability > 0 ? 1 / probability : null,
    matchedCombinationCount: uniqueCombos.size,
    matchedRowCount: matchedEntries.length,
    matchedEntries,
  }
}
