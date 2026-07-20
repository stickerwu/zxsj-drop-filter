import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/theme/theme-provider"
import { resetTianGongStore, useTianGongStore } from "./tiangong-store"
import { TianGongWorkspace } from "./tiangong-workspace"
import type {
  TianGongSolverClient,
  TianGongSolverHandlers,
} from "./worker-client"

function makePlacement(column: number) {
  return {
    piece: "craft" as const,
    cells: [
      { row: 1, column },
      { row: 1, column: column + 1 },
      { row: 2, column },
      { row: 2, column: column + 1 },
    ],
  }
}

function createClient(): TianGongSolverClient {
  return {
    solve: vi.fn((_config, handlers: TianGongSolverHandlers) => {
      const solutions = [
        { key: "first", placements: [makePlacement(0)] },
        { key: "second", placements: [makePlacement(1)] },
      ]
      handlers.onProgress(solutions)
      handlers.onComplete({
        status: "solved",
        reason: "done",
        solutions,
        truncated: null,
        durationMs: 12,
      })
      return "request-1"
    }),
    cancel: vi.fn(),
    dispose: vi.fn(),
  }
}

describe("tiangong workspace", () => {
  afterEach(cleanup)

  beforeEach(() => {
    window.localStorage.clear()
    resetTianGongStore()
  })

  it("renders the three-column workbench and edits board cells", async () => {
    render(
      <ThemeProvider>
        <TianGongWorkspace solverClient={createClient()} />
      </ThemeProvider>,
    )

    expect(screen.getByRole("heading", { name: "盘面设置" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "天工机巧盘" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "机巧石配置" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /第.*格/ })).toHaveLength(40)
    expect(screen.getByText("24 个解锁格")).toBeInTheDocument()

    const cell = screen.getByRole("button", {
      name: "第 2 行第 1 格，已解锁",
    })
    fireEvent.click(cell)

    expect(cell).toHaveAttribute("aria-label", "第 2 行第 1 格，已锁定")
    expect(screen.getByText("23 个解锁格")).toBeInTheDocument()
  })

  it("updates inventory with HeroUI number fields", () => {
    render(
      <ThemeProvider>
        <TianGongWorkspace solverClient={createClient()} />
      </ThemeProvider>,
    )

    const input = screen.getByRole("textbox", { name: "L 型数量" })
    expect(input).toHaveClass("tiangong-number-input")
    fireEvent.change(input, { target: { value: "7" } })
    fireEvent.blur(input)

    expect(useTianGongStore.getState().config.inventory.l).toBe(7)
  })

  it("solves and navigates one full-size board at a time", async () => {
    const client = createClient()
    render(
      <ThemeProvider>
        <TianGongWorkspace solverClient={client} />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "开始计算" }))

    expect(client.solve).toHaveBeenCalledOnce()
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByText("找到 2 种填法")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "下一个方案" }))
    expect(screen.getByText("2 / 2")).toBeInTheDocument()
    expect(
      within(screen.getByTestId("tiangong-board")).getAllByTestId("piece-cell"),
    ).toHaveLength(4)
  })

  it("cancels an active solve when the configuration changes", async () => {
    const client = createClient()
    vi.mocked(client.solve).mockImplementation(() => "pending")
    render(
      <ThemeProvider>
        <TianGongWorkspace solverClient={client} />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "开始计算" }))
    fireEvent.click(screen.getByRole("button", { name: "增加L 型" }))

    await waitFor(() => expect(client.cancel).toHaveBeenCalled())
  })
})
