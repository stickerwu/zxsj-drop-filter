import { create } from "zustand"

export type AppMode = "drops" | "tiangong"
export const APP_MODE_STORAGE_KEY = "zxsj-toolbox.app-mode.v1"

export function readStoredAppMode(): AppMode {
  if (typeof window === "undefined") return "drops"
  return window.localStorage.getItem(APP_MODE_STORAGE_KEY) === "tiangong"
    ? "tiangong"
    : "drops"
}

interface AppModeStore {
  mode: AppMode
  setMode: (mode: AppMode) => void
}

export const useAppModeStore = create<AppModeStore>((set) => ({
  mode: readStoredAppMode(),
  setMode: (mode) => {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode)
    set({ mode })
  },
}))
