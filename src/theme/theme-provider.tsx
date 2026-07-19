import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  isThemeMode,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from "./theme"

interface ThemeContextValue {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(stored) ? stored : "system"
}

function prefersDarkTheme() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStoredTheme)
  const [prefersDark, setPrefersDark] = useState(prefersDarkTheme)
  const resolvedTheme = resolveTheme(mode, prefersDark)

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
    root.classList.toggle("light", resolvedTheme === "light")
    root.dataset.theme = resolvedTheme
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  }, [mode, resolvedTheme])

  const value = useMemo(() => ({ mode, resolvedTheme, setMode }), [mode, resolvedTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useAppTheme must be used within ThemeProvider")
  return context
}
