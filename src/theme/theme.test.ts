import { describe, expect, it } from "vitest"
import { isThemeMode, resolveTheme } from "./theme"

describe("theme resolution", () => {
  it("uses explicit light and dark modes", () => {
    expect(resolveTheme("light", true)).toBe("light")
    expect(resolveTheme("dark", false)).toBe("dark")
  })

  it("resolves system mode from the media preference", () => {
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("system", false)).toBe("light")
  })

  it("accepts only supported stored values", () => {
    expect(isThemeMode("light")).toBe(true)
    expect(isThemeMode("dark")).toBe(true)
    expect(isThemeMode("system")).toBe(true)
    expect(isThemeMode("purple")).toBe(false)
  })
})
