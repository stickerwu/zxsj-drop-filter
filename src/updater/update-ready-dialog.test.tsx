import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { AppUpdaterController } from "./use-app-updater"
import { UpdateReadyDialog } from "./update-ready-dialog"

function createReadyController() {
  return {
    state: {
      status: "ready",
      currentVersion: "0.3.0",
      nextVersion: "0.3.1",
      notes: "- 修复发布流程\n- 优化更新体验",
      promptOpen: true,
    },
    checkNow: vi.fn().mockResolvedValue(undefined),
    dismissPrompt: vi.fn(),
    openPrompt: vi.fn(),
    installAndRelaunch: vi.fn().mockResolvedValue(undefined),
  } satisfies AppUpdaterController
}

afterEach(cleanup)

describe("UpdateReadyDialog", () => {
  it("shows versions and release notes", () => {
    render(
      <UpdateReadyDialog
        canOpen
        controller={createReadyController()}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "安装软件更新" }),
    ).toBeInTheDocument()
    expect(screen.getByText("v0.3.0")).toBeInTheDocument()
    expect(screen.getByText("v0.3.1")).toBeInTheDocument()
    expect(screen.getByText(/修复发布流程/)).toBeInTheDocument()
  })

  it("defers the dialog while another editor modal is open", () => {
    render(
      <UpdateReadyDialog
        canOpen={false}
        controller={createReadyController()}
      />,
    )

    expect(
      screen.queryByRole("dialog", { name: "安装软件更新" }),
    ).not.toBeInTheDocument()
  })

  it("supports installing later or immediately", async () => {
    const user = userEvent.setup()
    const controller = createReadyController()
    render(<UpdateReadyDialog canOpen controller={controller} />)

    await user.click(screen.getByRole("button", { name: "稍后安装" }))
    expect(controller.dismissPrompt).toHaveBeenCalledOnce()

    await user.click(screen.getByRole("button", { name: "立即安装并重启" }))
    expect(controller.installAndRelaunch).toHaveBeenCalledOnce()
  })
})
