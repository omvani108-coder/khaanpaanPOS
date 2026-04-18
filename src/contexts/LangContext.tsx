import { createContext, useContext, useState, useMemo } from "react";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/translations";
import t from "@/lib/translations";

const LANG_KEY = "khaanpaan-lang";

interface LangState {
  lang: Lang;
  toggleLang: () => void;
  /** Shorthand: t.nav.dashboard[lang] */
  T: typeof t;
  /** Resolve a leaf node {en,hi} to the current language string */
  l: (node: { en: string; hi: string }) => string;
}

const LangCtx = createContext<LangState | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem(LANG_KEY) as Lang | null) ?? "en";
  });

  function toggleLang() {
    setLang((prev) => {
      const next: Lang = prev === "en" ? "hi" : "en";
      localStorage.setItem(LANG_KEY, next);
      return next;
    });
  }

  const value = useMemo<LangState>(
    () => ({
      lang,
      toggleLang,
      T: t,
      l: (node) => node[lang],
    }),
    [lang]
  );

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): LangState {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
