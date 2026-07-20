import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  AppUpdaterController,
  AppUpdaterState,
} from "./use-app-updater"
import { UpdateStatusControl } from "./update-status-control"

function createController(
  state: AppUpdaterState,
) {
  return {
    state,
    checkNow: vi.fn().mockResolvedValue(undefined),
    dismissPrompt: vi.fn(),
    openPrompt: vi.fn(),
    installAndRelaunch: vi.fn().mockResolvedValue(undefined),
  } satisfies AppUpdaterController
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("UpdateStatusControl", () => {
  it("renders nothing when native updates are unavailable", () => {
    const { container } = render(
      <UpdateStatusControl
        controller={createController({ status: "unavailable" })}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("shows disabled checking and downloading states", () => {
    const { rerender } = render(
      <UpdateStatusControl
        controller={createController({ status: "checking" })}
      />,
    )
    expect(screen.getByRole("button", { name: "正在检查更新" })).toBeDisabled()

    rerender(
      <UpdateStatusControl
        controller={createController({
          status: "downloading",
          currentVersion: "0.3.0",
          nextVersion: "0.3.1",
          progress: 42,
        })}
      />,
    )
    expect(
      screen.getByRole("button", { name: "下载 v0.3.1 · 42%" }),
    ).toBeDisabled()
  })

  it("opens the install prompt when an update is ready", async () => {
    const user = userEvent.setup()
    const controller = createController({
      status: "ready",
      currentVersion: "0.3.0",
      nextVersion: "0.3.1",
      notes: "- updater",
      promptOpen: false,
    })
    render(<UpdateStatusControl controller={controller} />)

    await user.click(
      screen.getByRole("button", { name: "更新已就绪 v0.3.1" }),
    )

    expect(controller.openPrompt).toHaveBeenCalledOnce()
  })

  it("shows an error tooltip and retries the check", async () => {
    const user = userEvent.setup()
    const controller = createController({
      status: "error",
      currentVersion: "0.3.0",
      message: "网络连接失败，请稍后重试",
    })
    render(<UpdateStatusControl controller={controller} />)

    const button = screen.getByRole("button", { name: "更新失败，点击重试" })
    const description = screen.getByText("网络连接失败，请稍后重试")
    expect(button).toHaveAttribute("aria-describedby", description.id)
    await user.click(button)
    expect(controller.checkNow).toHaveBeenCalledOnce()
  })

  it("collapses the latest label after four seconds", async () => {
    vi.useFakeTimers()
    const controller = createController({
      status: "up-to-date",
      currentVersion: "0.3.0",
    })
    render(<UpdateStatusControl controller={controller} />)

    expect(
      screen.getByRole("button", { name: "已是最新 v0.3.0" }),
    ).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(4000))
    expect(
      screen.getByRole("button", { name: "检查更新" }),
    ).toBeInTheDocument()
  })
})
