import { calculateMatch } from "./matching"
import type { DropDataset, FilterState, Recommendation } from "./types"

export function recommendTreasures(
  dataset: DropDataset,
  filter: FilterState,
): Recommendation[] {
  const candidateDungeons = dataset.dungeons.filter((dungeon) =>
    filter.dungeons.length === 0 || filter.dungeons.includes(dungeon.id) || filter.dungeons.includes(dungeon.name),
  )
  const treasureMap = new Map<string, Recommendation>()

  for (const dungeon of candidateDungeons) {
    for (const treasure of dungeon.treasures) {
      const match = calculateMatch(treasure, dungeon, filter)
      const existing = treasureMap.get(treasure.name)
      const detail = { ...match, dungeonName: dungeon.name }
      if (!existing) {
        treasureMap.set(treasure.name, {
          id: `${treasure.id}-${dungeon.id}`,
          treasureId: treasure.id,
          treasureName: treasure.name,
          bestDungeonId: dungeon.id,
          bestDungeonName: dungeon.name,
          bestProbability: match.probability,
          averageProbability: match.probability,
          matchedCombinationCount: match.matchedCombinationCount,
          matchedRowCount: match.matchedRowCount,
          totalMatchedRows: match.matchedRowCount,
          bestMatch: match,
          dungeonDetails: [detail],
        })
        continue
      }

      existing.dungeonDetails.push(detail)
      existing.totalMatchedRows += match.matchedRowCount
      existing.matchedCombinationCount = Math.max(existing.matchedCombinationCount, match.matchedCombinationCount)
      existing.matchedRowCount = Math.max(existing.matchedRowCount, match.matchedRowCount)
      if (match.probability > existing.bestProbability) {
        existing.bestProbability = match.probability
        existing.bestDungeonId = dungeon.id
        existing.bestDungeonName = dungeon.name
        existing.bestMatch = match
      }
      existing.averageProbability = existing.dungeonDetails.reduce((sum, item) => sum + item.probability, 0) / existing.dungeonDetails.length
    }
  }

  return [...treasureMap.values()].filter((item) => item.totalMatchedRows > 0).sort((a, b) =>
    b.bestProbability - a.bestProbability
    || b.averageProbability - a.averageProbability
    || b.totalMatchedRows - a.totalMatchedRows
    || a.treasureName.localeCompare(b.treasureName, "zh-CN"),
  )
}
