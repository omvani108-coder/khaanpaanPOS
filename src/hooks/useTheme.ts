import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "khaanpaan-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY) as Theme | null;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(KEY, theme);
  }, [theme]);

  function toggle() {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggle, isDark: theme === "dark" };
}
