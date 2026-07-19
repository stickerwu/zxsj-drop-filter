import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { demoDataset } from "@/data/demo-data"
import { useAppStore } from "@/store/app-store"
import { DropEditorModal } from "./drop-editor-modal"

describe("drop editor modal", () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAppStore.setState({ dataset: demoDataset })
  })

  it("switches dungeon and attribute with select controls", async () => {
    const user = userEvent.setup()
    render(<DropEditorModal open onOpenChange={() => undefined} />)

    expect(screen.getByRole("dialog", { name: "掉落表编辑器" })).toHaveAttribute(
      "data-editor-layout",
      "reference",
    )
    await user.click(screen.getByRole("button", { name: /副本$/ }))
    expect(document.querySelectorAll('[role="option"] .lucide-check')).toHaveLength(1)
    await user.click(screen.getByRole("option", { name: "斩恨踏蜚境" }))

    const firstRow = screen.getByTestId("drop-entry-row-0")
    expect(firstRow).toHaveAttribute("data-row-density", "compact")
    await user.click(within(firstRow).getByRole("button", { name: /属性$/ }))
    await user.click(screen.getByRole("option", { name: "会专" }))

    expect(within(firstRow).getByDisplayValue("会心 + 专精")).toBeInTheDocument()
  })

  it("blocks saving when a weight is not positive", async () => {
    const user = userEvent.setup()
    render(<DropEditorModal open onOpenChange={() => undefined} />)

    const firstRow = screen.getByTestId("drop-entry-row-0")
    const weightInput = within(firstRow).getByRole("spinbutton", { name: "权重" })
    await user.clear(weightInput)
    await user.type(weightInput, "0")

    expect(screen.getByText("权重必须是大于 0 的数字")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /保存并应用/ })).toBeDisabled()
  })

  it("uses a centered spacious header and two soft body surfaces", () => {
    render(<DropEditorModal open onOpenChange={() => undefined} />)

    const dialog = screen.getByRole("dialog", { name: "掉落表编辑器" })
    const header = within(dialog).getByTestId("drop-editor-header")
    const titleGroup = within(header).getByTestId("drop-editor-title-group")
    const body = within(dialog).getByTestId("drop-editor-body")
    const controlsSurface = within(body).getByTestId("drop-editor-controls-surface")
    const entriesSurface = within(body).getByTestId("drop-editor-entries-surface")
    const footer = within(dialog).getByTestId("drop-editor-footer")

    expect(dialog).toHaveClass("h-[720px]")
    expect(dialog).toHaveClass("max-h-[calc(100vh-2rem)]")
    expect(header).toHaveClass("h-[72px]")
    expect(titleGroup).toHaveClass("justify-center")
    expect(within(titleGroup).getByText("掉落表编辑器")).toHaveClass("text-lg")
    expect(controlsSurface).toHaveClass("shadow-sm")
    expect(entriesSurface).toHaveClass("shadow-sm")
    expect(controlsSurface).not.toHaveClass("border-r")
    expect(footer).toHaveClass("h-[60px]")
    expect(footer).not.toHaveClass("border-t")
    expect(screen.getByRole("button", { name: /保存并应用/ })).toHaveAttribute(
      "data-button-tone",
      "strong",
    )
  })

  it("keeps drop rows compact and single-line inside the entries surface", () => {
    render(<DropEditorModal open onOpenChange={() => undefined} />)

    const entriesSurface = screen.getByTestId("drop-editor-entries-surface")
    const firstRow = within(entriesSurface).getByTestId("drop-entry-row-0")

    expect(firstRow).toHaveAttribute("data-row-density", "compact")
    expect(firstRow).toHaveClass("h-[46px]")
    expect(firstRow).toHaveClass("shadow-sm")
    expect(firstRow).not.toHaveClass("border")
    expect(within(firstRow).getByTestId("verified-control")).toHaveAttribute(
      "data-control-tone",
      "strong",
    )
    expect(within(firstRow).getByTestId("verified-control")).toHaveAttribute(
      "data-verification-state",
      "verified",
    )
    expect(
      within(firstRow)
        .getByTestId("verified-control")
        .closest('[data-slot="checkbox"]'),
    ).toHaveAttribute(
      "data-selected",
      "true",
    )
    expect(within(firstRow).getByRole("button", { name: "删除掉落行" })).toHaveAttribute(
      "data-button-tone",
      "strong",
    )
  })

  it("exposes a distinct unverified confirmation state", async () => {
    const user = userEvent.setup()
    render(<DropEditorModal open onOpenChange={() => undefined} />)

    const firstRow = screen.getByTestId("drop-entry-row-0")
    await user.click(within(firstRow).getByRole("checkbox", { name: "已核对" }))

    expect(within(firstRow).getByTestId("verified-control")).toHaveAttribute(
      "data-verification-state",
      "unverified",
    )
  })
})
