import { beforeEach, describe, expect, it } from "vitest"
import { createDefaultTianGongConfig } from "./config"
import {
  TIANGONG_CONFIG_STORAGE_KEY,
  resetTianGongStore,
  useTianGongStore,
} from "./tiangong-store"

describe("tiangong store", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetTianGongStore()
  })

  it("persists configuration changes without persisting solutions", () => {
    useTianGongStore.getState().setInventory("l", 7)
    useTianGongStore.setState({
      solutions: [{ key: "solution", placements: [] }],
      solveStatus: "solved",
    })
    useTianGongStore.getState().setMaxSolutions(80)

    expect(JSON.parse(
      window.localStorage.getItem(TIANGONG_CONFIG_STORAGE_KEY) ?? "{}",
    )).toMatchObject({
      version: 1,
      inventory: { l: 7 },
      maxSolutions: 80,
    })
    expect(
      window.localStorage.getItem(TIANGONG_CONFIG_STORAGE_KEY),
    ).not.toContain("solution")
    expect(useTianGongStore.getState()).toMatchObject({
      solutions: [],
      solveStatus: "idle",
      viewMode: "edit",
    })
  })

  it("loads a validated configuration and restores defaults", () => {
    const imported = {
      ...createDefaultTianGongConfig(),
      inventory: {
        ...createDefaultTianGongConfig().inventory,
        t: 9,
      },
    }

    useTianGongStore.getState().loadConfig(imported)
    expect(useTianGongStore.getState().config.inventory.t).toBe(9)

    useTianGongStore.getState().resetConfig()
    expect(useTianGongStore.getState().config).toEqual(
      createDefaultTianGongConfig(),
    )
  })

  it("toggles only existing board cells", () => {
    useTianGongStore.getState().toggleCell({ row: 1, column: 0 })
    expect(useTianGongStore.getState().config.activeCells).not.toContainEqual({
      row: 1,
      column: 0,
    })

    useTianGongStore.getState().toggleCell({ row: 0, column: 0 })
    expect(useTianGongStore.getState().config.activeCells).not.toContainEqual({
      row: 0,
      column: 0,
    })
  })

  it("keeps the request error available for the interface", () => {
    useTianGongStore.getState().failSolving("solver exploded")

    expect(useTianGongStore.getState()).toMatchObject({
      solveStatus: "error",
      errorMessage: "solver exploded",
    })
  })

  it("normalizes non-finite numeric input before persistence", () => {
    useTianGongStore.getState().setInventory("l", Number.NaN)
    useTianGongStore.getState().setMaxSolutions(Number.NaN)

    expect(useTianGongStore.getState().config).toMatchObject({
      inventory: { l: 0 },
      maxSolutions: 1,
    })
  })

  it("applies scanned inventory in one state transition and invalidates solutions", () => {
    useTianGongStore.setState({
      solutions: [{ key: "solution", placements: [] }],
      solveStatus: "solved",
      viewMode: "solution",
    })

    useTianGongStore.getState().applyInventory({
      square: 120,
      l: 30,
      t: 8,
      line: 6,
      j: 4,
    })

    expect(useTianGongStore.getState()).toMatchObject({
      config: {
        inventory: {
          square: 120,
          l: 30,
          t: 8,
          line: 6,
          j: 4,
        },
      },
      solutions: [],
      solveStatus: "idle",
      viewMode: "edit",
    })
  })
})
