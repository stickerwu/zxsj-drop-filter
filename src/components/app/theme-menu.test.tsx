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

    const menu = await screen.findByRole("menu", { name: "主题模式" })
    expect(menu).toHaveAttribute("data-density", "compact")

    const systemItem = screen.getByRole("menuitemradio", { name: "跟随系统" })
    expect(
      within(systemItem).getByTestId("theme-selected-system"),
    ).toHaveAttribute("data-visible", "true")
    expect(
      within(screen.getByRole("menuitemradio", { name: "亮色" })).getByTestId("theme-selected-light"),
    ).not.toHaveAttribute("data-visible")
    expect(
      within(screen.getByRole("menuitemradio", { name: "暗色" })).getByTestId("theme-selected-dark"),
    ).not.toHaveAttribute("data-visible")

    await user.click(screen.getByText("暗色"))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")

    await user.click(screen.getByRole("button", { name: "切换主题" }))
    const darkItem = screen.getByRole("menuitemradio", { name: "暗色" })
    expect(
      within(darkItem).getByTestId("theme-selected-dark"),
      ).toHaveAttribute("data-visible", "true")
    expect(
      within(screen.getByRole("menuitemradio", { name: "亮色" })).getByTestId("theme-selected-light"),
    ).not.toHaveAttribute("data-visible")
    expect(
      within(screen.getByRole("menuitemradio", { name: "跟随系统" })).getByTestId("theme-selected-system"),
    ).not.toHaveAttribute("data-visible")
  })
})
