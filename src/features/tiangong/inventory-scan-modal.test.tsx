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
})
