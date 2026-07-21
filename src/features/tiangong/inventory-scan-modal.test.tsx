import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/theme/theme-provider"
import { createEmptyInventorySnapshot } from "./inventory"
import { InventoryScanModal } from "./inventory-scan-modal"
import type { InventoryScannerClient } from "./inventory-client"

describe("InventoryScanModal", () => {
  afterEach(() => cleanup())

  it("shows game windows and keeps apply disabled for an incomplete scan", async () => {
    const client: InventoryScannerClient = {
      listWindows: vi.fn(async () => [{
        windowId: "1",
        processName: "ZhuxianClient-Win64-Shipping.exe",
        title: "诛仙世界",
        minimized: false,
      }]),
      begin: vi.fn(),
      probe: vi.fn(),
      capture: vi.fn(),
      finish: vi.fn(),
      cancel: vi.fn(async () => undefined),
      load: vi.fn(async () => createEmptyInventorySnapshot()),
      save: vi.fn(async () => undefined),
      listenHotkey: vi.fn(async () => () => undefined),
    }

    render(
      <ThemeProvider>
        <InventoryScanModal client={client} open onOpenChange={() => undefined} />
      </ThemeProvider>,
    )

    expect((await screen.findAllByText("诛仙世界")).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "应用库存" }))
    expect(client.save).not.toHaveBeenCalled()
  })

  it("explains the required game page and can refresh game windows", async () => {
    const client: InventoryScannerClient = {
      listWindows: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          windowId: "2",
          processName: "ZhuxianClient-Win64-Shipping",
          title: "诛仙世界",
          minimized: false,
        }]),
      begin: vi.fn(),
      probe: vi.fn(),
      capture: vi.fn(),
      finish: vi.fn(),
      cancel: vi.fn(async () => undefined),
      load: vi.fn(async () => createEmptyInventorySnapshot()),
      save: vi.fn(async () => undefined),
      listenHotkey: vi.fn(async () => () => undefined),
    }

    render(
      <ThemeProvider>
        <InventoryScanModal client={client} open onOpenChange={() => undefined} />
      </ThemeProvider>,
    )

    const modal = await screen.findByTestId("inventory-scan-modal")
    expect(
      within(modal).getByText("请打开个人游戏角色的天工机巧盘页面"),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "刷新游戏窗口" }))

    await waitFor(() => expect(client.listWindows).toHaveBeenCalledTimes(2))
    expect((await screen.findAllByText("诛仙世界")).length).toBeGreaterThan(0)
  })

  it("uses themed HeroUI controls instead of native select and number inputs", async () => {
    const client: InventoryScannerClient = {
      listWindows: vi.fn(async () => [{
        windowId: "1",
        processName: "ZhuxianClient-Win64-Shipping",
        title: "诛仙世界",
        minimized: false,
      }]),
      begin: vi.fn(),
      probe: vi.fn(),
      capture: vi.fn(),
      finish: vi.fn(),
      cancel: vi.fn(async () => undefined),
      load: vi.fn(async () => createEmptyInventorySnapshot()),
      save: vi.fn(async () => undefined),
      listenHotkey: vi.fn(async () => () => undefined),
    }

    render(
      <ThemeProvider>
        <InventoryScanModal client={client} open onOpenChange={() => undefined} />
      </ThemeProvider>,
    )

    await screen.findAllByText("诛仙世界")
    expect(document.querySelector('[data-slot="select-trigger"]')).not.toBeNull()
    expect(document.querySelector('input[type="number"]')).toBeNull()
    expect(screen.getByRole("switch", { name: "扫描提示音" })).toBeInTheDocument()
  })

  it("uses a compact frameless header and footer with manual add at the tabbar edge", async () => {
    const client: InventoryScannerClient = {
      listWindows: vi.fn(async () => []),
      begin: vi.fn(),
      probe: vi.fn(),
      capture: vi.fn(),
      finish: vi.fn(),
      cancel: vi.fn(async () => undefined),
      load: vi.fn(async () => createEmptyInventorySnapshot()),
      save: vi.fn(async () => undefined),
      listenHotkey: vi.fn(async () => () => undefined),
    }

    render(
      <ThemeProvider>
        <InventoryScanModal client={client} open onOpenChange={() => undefined} />
      </ThemeProvider>,
    )

    const header = await screen.findByTestId("inventory-scan-header")
    const tabbar = screen.getByTestId("inventory-scan-tabbar")
    const addButton = screen.getByTestId("inventory-scan-add-item")
    const footer = screen.getByTestId("inventory-scan-footer")
    const sessionStatus = screen.getByTestId("inventory-scan-session-status")

    expect(header).toHaveClass("h-[60px]")
    expect(header).toHaveClass("flex-row")
    expect(header).not.toHaveClass("border-b")
    expect(sessionStatus).toHaveClass("mr-8")
    expect(tabbar).toHaveClass("h-[52px]")
    expect(tabbar).not.toHaveClass("border-b")
    expect(addButton).toHaveClass("ml-auto")
    expect(tabbar.lastElementChild).toBe(addButton)
    expect(footer).toHaveClass("h-[50px]")
    expect(footer).not.toHaveClass("border-t")
  })

  it("enables continuous scanning and captures a stable frame automatically", async () => {
    const initial = createEmptyInventorySnapshot()
    const client: InventoryScannerClient = {
      listWindows: vi.fn(async () => [{
        windowId: "1",
        processName: "ZhuxianClient-Win64-Shipping.exe",
        title: "诛仙世界",
        minimized: false,
      }]),
      begin: vi.fn(async () => ({
        sessionId: "scan-1",
        window: {
          windowId: "1",
          processName: "ZhuxianClient-Win64-Shipping.exe",
          title: "诛仙世界",
          minimized: false,
        },
        snapshot: initial,
      })),
      probe: vi.fn(async () => ({
        sessionId: "scan-1",
        phase: "stable" as const,
        stableForMs: 350,
        shouldCapture: true,
      })),
      capture: vi.fn(async () => initial),
      finish: vi.fn(async () => initial),
      cancel: vi.fn(async () => undefined),
      load: vi.fn(async () => initial),
      save: vi.fn(async () => undefined),
      listenHotkey: vi.fn(async () => () => undefined),
    }

    render(
      <ThemeProvider>
        <InventoryScanModal client={client} open onOpenChange={() => undefined} />
      </ThemeProvider>,
    )

    expect(await screen.findByRole("switch", { name: "连续扫描" })).toBeChecked()
    fireEvent.click(screen.getByRole("button", { name: "开启扫描" }))

    await waitFor(() => expect(client.begin).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(client.probe).toHaveBeenCalled())
    await waitFor(() => expect(client.capture).toHaveBeenCalledWith("scan-1"))

    fireEvent.click(screen.getByRole("switch", { name: "连续扫描" }))
    const probeCount = vi.mocked(client.probe).mock.calls.length
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    expect(client.probe).toHaveBeenCalledTimes(probeCount)
  })
})
