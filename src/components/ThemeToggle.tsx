import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** compact = icon-only pill, no label, no track — for mobile header */
  compact?: boolean;
}

export function ThemeToggle({ className, compact }: Props) {
  const { isDark, toggle } = useTheme();

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          "bg-muted/80 hover:bg-muted border border-border/60",
          className
        )}
      >
        {isDark
          ? <Sun  className="w-4 h-4 text-gold-400" />
          : <Moon className="w-4 h-4 text-slate-500" />
        }
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        "border border-border bg-muted/60 hover:bg-muted",
        "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <div className={cn(
        "relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0",
        isDark ? "bg-gold-500" : "bg-slate-200 dark:bg-slate-600"
      )}>
        <span className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center",
          isDark ? "translate-x-4" : "translate-x-0"
        )}>
          {isDark
            ? <Moon className="w-2.5 h-2.5 text-gold-600" />
            : <Sun  className="w-2.5 h-2.5 text-amber-500" />
          }
        </span>
      </div>
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
