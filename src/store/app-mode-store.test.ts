import { beforeEach, describe, expect, it } from "vitest"
import {
  APP_MODE_STORAGE_KEY,
  readStoredAppMode,
  useAppModeStore,
} from "./app-mode-store"

describe("app mode store", () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAppModeStore.setState({ mode: "drops" })
  })

  it("persists the selected primary mode", () => {
    useAppModeStore.getState().setMode("tiangong")

    expect(useAppModeStore.getState().mode).toBe("tiangong")
    expect(window.localStorage.getItem(APP_MODE_STORAGE_KEY)).toBe("tiangong")
  })

  it("ignores invalid stored modes", () => {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, "unknown")

    expect(readStoredAppMode()).toBe("drops")
  })
})
