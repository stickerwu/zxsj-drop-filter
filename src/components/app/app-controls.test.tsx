import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { demoDataset } from "@/data/demo-data"
import { useAppStore } from "@/store/app-store"
import { FilterSidebar } from "./filter-sidebar"
import { SummaryStrip } from "./summary-strip"

describe("app controls", () => {
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
    })
  })

  it("updates attribute filters from the sidebar", async () => {
    const user = userEvent.setup()
    render(<FilterSidebar />)

    await user.click(screen.getByRole("button", { name: "会专" }))

    expect(useAppStore.getState().filters.attributes).toEqual(["会专"])
  })

  it("summarizes the active conditions and result counts", () => {
    useAppStore.setState({
      filters: {
        attributes: ["专精"],
        mode: "all",
        slots: ["武器"],
        dungeons: ["斩恨踏蜚境"],
      },
    })

    render(<SummaryStrip recommendationCount={7} matchedRows={18} />)

    expect(screen.getByText(/专精/)).toBeInTheDocument()
    expect(screen.getByText(/同一词条全满足/)).toBeInTheDocument()
    expect(screen.getByText(/18 条掉落/)).toBeInTheDocument()
    expect(screen.getByText(/7 个推荐宝鉴/)).toBeInTheDocument()
  })
})
