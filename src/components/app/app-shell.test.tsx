import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { demoDataset } from "@/data/demo-data"
import { useAppStore } from "@/store/app-store"
import { ThemeProvider } from "@/theme/theme-provider"
import type { AppUpdaterController } from "@/updater/use-app-updater"
import { AppShell } from "./app-shell"

function createUpdaterController(
  state: AppUpdaterController["state"],
): AppUpdaterController {
  return {
    state,
    checkNow: vi.fn().mockResolvedValue(undefined),
    dismissPrompt: vi.fn(),
    openPrompt: vi.fn(),
    installAndRelaunch: vi.fn().mockResolvedValue(undefined),
  }
}

describe("app shell", () => {
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

  it("renders the complete desktop workbench", () => {
    render(
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>,
    )

    expect(screen.getByText("诛仙高手秘境掉落软件")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /推荐宝鉴/ })).toBeInTheDocument()
    expect(screen.getByText(/本地计算/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "数据编辑" })).toHaveAttribute(
      "data-shadow",
      "none",
    )
    expect(screen.getByRole("button", { name: "切换主题" }).parentElement).not.toHaveProperty(
      "tagName",
      "BUTTON",
    )
  })

  it("discards editor drafts after closing and reloads replaced data", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "数据编辑" }))
    await screen.findByTestId("drop-entry-row-0")
    const originalExpandedValue = (
      within(screen.getByTestId("drop-entry-row-0")).getByRole("textbox", {
        name: "展开属性",
      }) as HTMLInputElement
    ).value
    fireEvent.click(
      within(screen.getByTestId("drop-entry-row-0")).getByRole("button", {
        name: /属性$/,
      }),
    )
    await user.click(await screen.findByRole("option", { name: "会专" }))
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "掉落表编辑器" })).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: "数据编辑" }))
    await screen.findByTestId("drop-entry-row-0")

    expect(
      within(screen.getByTestId("drop-entry-row-0")).getByDisplayValue(
        originalExpandedValue,
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "掉落表编辑器" })).not.toBeInTheDocument()
    })
    const replacement = structuredClone(demoDataset)
    replacement.dungeons[0].treasures[0].entries[0] = {
      ...replacement.dungeons[0].treasures[0].entries[0],
      attributeCombo: "专精",
      expandedAttributes: ["专精"],
    }
    useAppStore.setState({ dataset: replacement })
    fireEvent.click(screen.getByRole("button", { name: "数据编辑" }))
    await screen.findByTestId("drop-entry-row-0")

    expect(
      within(screen.getByTestId("drop-entry-row-0")).getByRole("textbox", {
        name: "展开属性",
      }),
    ).toHaveValue("专精")
  })

  it("defers a ready update dialog until the editor closes", async () => {
    const idleController = createUpdaterController({ status: "idle" })
    const readyController = createUpdaterController({
      status: "ready",
      currentVersion: "0.3.0",
      nextVersion: "0.3.1",
      notes: "- updater",
      promptOpen: true,
    })
    const { rerender } = render(
      <ThemeProvider>
        <AppShell updaterController={idleController} />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "数据编辑" }))
    await screen.findByRole("dialog", { name: "掉落表编辑器" })

    rerender(
      <ThemeProvider>
        <AppShell updaterController={readyController} />
      </ThemeProvider>,
    )
    expect(
      screen.queryByRole("dialog", { name: "安装软件更新" }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "掉落表编辑器" }),
      ).not.toBeInTheDocument()
    })
    expect(
      await screen.findByRole("dialog", { name: "安装软件更新" }),
    ).toBeInTheDocument()
  })
})
