import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { demoDataset } from "@/data/demo-data"
import { recommendTreasures } from "@/domain/recommendations"
import { useAppStore } from "@/store/app-store"
import { DungeonDetailTable } from "./dungeon-detail-table"
import { HitItemTable } from "./hit-item-table"
import { ResultsTabs } from "./results-tabs"

describe("results tabs", () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAppStore.setState({
      dataset: demoDataset,
      filters: {
        attributes: [],
        mode: "any",
        slots: [],
        dungeons: [],
      },
      selectedRecommendationId: null,
      activeResultTab: "recommendations",
    })
  })

  it("renders all result views as tabs", () => {
    const { container } = render(<ResultsTabs recommendations={[]} />)

    expect(screen.getByRole("tab", { name: /推荐宝鉴/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /副本.*宝鉴明细/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /命中装备列表/ })).toBeInTheDocument()
    expect(container.querySelector("[data-results-tab-list]")).toHaveAttribute(
      "data-layout",
      "full-width",
    )
    expect(screen.getByRole("grid", { name: "推荐宝鉴列表" })).toHaveAttribute(
      "data-density",
      "reference",
    )
    expect(screen.getByRole("grid", { name: "推荐宝鉴列表" })).toHaveAttribute(
      "data-header-corners",
      "square",
    )
    expect(screen.getByRole("columnheader", { name: "排名" })).toHaveAttribute(
      "data-readable-header",
      "true",
    )
  })

  it("selects the clicked recommendation row for the detail panel", async () => {
    const user = userEvent.setup()
    const recommendations = recommendTreasures(demoDataset, {
      attributes: [],
      mode: "any",
      slots: [],
      dungeons: [],
    })

    render(<ResultsTabs recommendations={recommendations} />)

    await user.click(
      screen.getByRole("row", { name: new RegExp(recommendations[1].treasureName) }),
    )

    expect(useAppStore.getState().selectedRecommendationId).toBe(recommendations[1].id)
  })

  it("selects a recommendation from the dungeon detail table", async () => {
    const user = userEvent.setup()
    const recommendations = recommendTreasures(demoDataset, {
      attributes: [],
      mode: "any",
      slots: [],
      dungeons: [],
    })

    render(<DungeonDetailTable recommendations={recommendations} />)

    const row = screen
      .getAllByRole("gridcell", { name: recommendations[1].treasureName })[0]
      .closest('[role="row"]')
    expect(row).toBeInTheDocument()
    await user.click(row!)

    expect(useAppStore.getState().selectedRecommendationId).toBe(recommendations[1].id)
  })

  it("selects a recommendation from the hit item table", async () => {
    const user = userEvent.setup()
    const recommendations = recommendTreasures(demoDataset, {
      attributes: [],
      mode: "any",
      slots: [],
      dungeons: [],
    })

    render(<HitItemTable recommendations={recommendations} />)

    const row = screen
      .getAllByRole("gridcell", { name: recommendations[1].treasureName })[0]
      .closest('[role="row"]')
    expect(row).toBeInTheDocument()
    await user.click(row!)

    expect(useAppStore.getState().selectedRecommendationId).toBe(recommendations[1].id)
  })
})
