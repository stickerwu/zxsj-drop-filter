import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { THEME_STORAGE_KEY } from "@/theme/theme"
import { ThemeProvider } from "@/theme/theme-provider"
import { ThemeMenu } from "./theme-menu"

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("theme menu", () => {
  it("renders compact options and marks only the active theme", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeMenu />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole("button", { name: "切换主题" }))

    const menu = await screen.findByRole("menu")
    expect(menu).toHaveAttribute("data-density", "compact")

    const systemItem = screen
      .getByText("跟随系统")
      .closest('[data-slot="menu-item"]')
    expect(systemItem).toBeInTheDocument()
    expect(
      within(systemItem as HTMLElement).getByTestId("theme-selected-system"),
    ).toHaveAttribute("data-visible", "true")

    await user.click(screen.getByText("暗色"))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")

    await user.click(screen.getByRole("button", { name: "切换主题" }))
    const darkItem = screen.getByText("暗色").closest('[data-slot="menu-item"]')
    expect(
      within(darkItem as HTMLElement).getByTestId("theme-selected-dark"),
    ).toHaveAttribute("data-visible", "true")
  })
})
