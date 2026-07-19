import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ThemeProvider } from "@/theme/theme-provider"
import { AppShell } from "./app-shell"

describe("app shell", () => {
  afterEach(cleanup)

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
})
