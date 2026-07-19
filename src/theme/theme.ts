export type ThemeMode = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "zxsj-theme"

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  return mode === "system" ? (prefersDark ? "dark" : "light") : mode
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system"
}
