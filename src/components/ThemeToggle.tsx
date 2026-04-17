import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all",
        "text-slate-400 hover:text-slate-700 hover:bg-slate-100",
        "dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/10",
        className
      )}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-gold-400" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
