import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/theme/theme-provider"
import { createEmptyInventorySnapshot } from "./inventory"
import { InventoryScanModal } from "./inventory-scan-modal"
import type { InventoryScannerClient } from "./inventory-client"

describe("InventoryScanModal", () => {
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

    expect(await screen.findByText("诛仙世界")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "应用库存" }))
    expect(client.save).not.toHaveBeenCalled()
  })
})
