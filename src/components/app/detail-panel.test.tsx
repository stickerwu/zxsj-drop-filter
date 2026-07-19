import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { demoDataset } from "@/data/demo-data"
import { recommendTreasures } from "@/domain/recommendations"
import { DetailPanel } from "./detail-panel"

describe("detail panel", () => {
  afterEach(cleanup)

  it("shows the selected recommendation metrics and matching entries", () => {
    const recommendation = recommendTreasures(demoDataset, {
      attributes: ["专精"],
      mode: "any",
      slots: [],
      dungeons: [],
    })[0]

    const { container } = render(<DetailPanel recommendation={recommendation} />)

    expect(screen.getByText(recommendation.treasureName)).toBeInTheDocument()
    expect(screen.getAllByText(recommendation.bestDungeonName).length).toBeGreaterThan(0)
    expect(screen.getByText("全部命中装备")).toBeInTheDocument()
    expect(screen.getByText("各副本表现")).toBeInTheDocument()
    expect(
      container.querySelector(
        `[data-slot-visual="${recommendation.bestMatch.matchedEntries[0].slot}"]`,
      ),
    ).toBeInTheDocument()
  })
})
