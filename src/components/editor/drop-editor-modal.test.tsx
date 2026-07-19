import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { DropEditorModal } from "./drop-editor-modal"

describe("drop editor modal", () => {
  afterEach(cleanup)

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
})
