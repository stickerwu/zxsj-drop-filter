import { create } from "zustand"
import { demoDataset } from "@/data/demo-data"
import { recommendTreasures } from "@/domain/recommendations"
import type { DropDataset, FilterState } from "@/domain/types"

interface AppStore {
  dataset: DropDataset
  filters: FilterState
  selectedRecommendationId: string | null
  activeResultTab: "recommendations" | "dungeon-details" | "hit-items"
  setDataset: (dataset: DropDataset) => void
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  clearFilters: () => void
  selectRecommendation: (id: string | null) => void
  setResultTab: (tab: AppStore["activeResultTab"]) => void
}

const emptyFilters: FilterState = {
  attributes: [],
  mode: "any",
  slots: [],
  dungeons: [],
}

export const useAppStore = create<AppStore>((set) => ({
  dataset: demoDataset,
  filters: emptyFilters,
  selectedRecommendationId: null,
  activeResultTab: "recommendations",
  setDataset: (dataset) => set({ dataset, selectedRecommendationId: null }),
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value },
    selectedRecommendationId: null,
  })),
  clearFilters: () => set({ filters: emptyFilters, selectedRecommendationId: null }),
  selectRecommendation: (id) => set({ selectedRecommendationId: id }),
  setResultTab: (tab) => set({ activeResultTab: tab }),
}))

export function selectRecommendations(state: AppStore) {
  return recommendTreasures(state.dataset, state.filters)
}
