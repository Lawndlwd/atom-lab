import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const STORAGE_KEY = "identity:theme";
const Ctx = createContext<Ctx>({ theme: "dark", toggle: () => {}, setTheme: () => {} });

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark") return raw;
  return "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#e8e2d4" : "#0d0b09");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
