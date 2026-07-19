import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ResultsTabs } from "./results-tabs"

describe("results tabs", () => {
  afterEach(cleanup)

  it("renders all result views as tabs", () => {
    render(<ResultsTabs recommendations={[]} />)

    expect(screen.getByRole("tab", { name: /推荐宝鉴/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /副本.*宝鉴明细/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /命中装备列表/ })).toBeInTheDocument()
    expect(screen.getByRole("grid", { name: "推荐宝鉴列表" })).toHaveAttribute(
      "data-density",
      "reference",
    )
    expect(screen.getByRole("columnheader", { name: "排名" })).toHaveAttribute(
      "data-readable-header",
      "true",
    )
  })
})
