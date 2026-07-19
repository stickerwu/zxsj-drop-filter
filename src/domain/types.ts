export const BASE_ATTRIBUTES = ["会心", "专精", "调息", "元御"] as const
export const COMBINATION_ATTRIBUTES = ["会专", "会调", "会元", "专调", "专元", "调元"] as const
export const FILTER_ATTRIBUTES = [...BASE_ATTRIBUTES, ...COMBINATION_ATTRIBUTES] as const
export type AttributeName = (typeof BASE_ATTRIBUTES)[number]
export type AttributeFilterName = (typeof FILTER_ATTRIBUTES)[number]
export type MatchMode = "any" | "all"

export interface DropEntry {
  id: string
  name?: string
  slot: string
  attributeCombo: string
  expandedAttributes: AttributeName[]
  weight: number
  verified: boolean
  quality?: string
  note?: string
  tags?: string[]
}

export interface Treasure {
  id: string
  name: string
  entries: DropEntry[]
}

export interface Dungeon {
  id: string
  name: string
  treasures: Treasure[]
}

export interface DropDataset {
  schemaVersion: 2
  attributes: AttributeFilterName[]
  slots: string[]
  dungeons: Dungeon[]
}

export interface FilterState {
  attributes: AttributeFilterName[]
  mode: MatchMode
  slots: string[]
  dungeons: string[]
}

export interface MatchResult {
  treasureId: string
  dungeonId: string
  totalWeight: number
  totalRowCount: number
  hitWeight: number
  probability: number
  expectedRuns: number | null
  matchedCombinationCount: number
  matchedRowCount: number
  matchedEntries: DropEntry[]
}

export interface Recommendation {
  id: string
  treasureId: string
  treasureName: string
  bestDungeonId: string
  bestDungeonName: string
  bestProbability: number
  averageProbability: number
  matchedCombinationCount: number
  matchedRowCount: number
  totalMatchedRows: number
  bestMatch: MatchResult
  dungeonDetails: Array<MatchResult & { dungeonName: string }>
}

export interface ParseWarning {
  path: string
  message: string
}

export interface ParseResult {
  dataset: DropDataset
  warnings: ParseWarning[]
}

export interface RawDropEntry {
  id?: string
  name?: string
  slot: string
  attributeCombo: string
  expandedAttributes?: string[]
  weight: number
  verified?: boolean
  quality?: string
  note?: string
  tags?: string[]
}

export interface RawTreasure {
  id?: string
  name: string
  entries: RawDropEntry[]
}

export interface RawDungeon {
  id?: string
  name: string
  treasures: RawTreasure[]
}

export interface RawDataset {
  schemaVersion?: number
  attributes?: string[]
  slots?: string[]
  dungeons: RawDungeon[]
}

export interface LegacyDropItem {
  name: string
  slot: string
  weight: number
  quality?: string
  note?: string
  tags?: string[]
  attrs?: Array<{ name: string }>
}

export interface LegacyDropTable {
  dungeon: string
  baojian: string
  note?: string
  items: LegacyDropItem[]
}

export interface LegacyDataset {
  version: number
  dungeons: string[]
  baojian: string[]
  slots: string[]
  attributes: string[]
  source_note?: string
  tables: LegacyDropTable[]
}
