import { useLang } from "@/contexts/LangContext";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** compact = icon-only pill for mobile header */
  compact?: boolean;
}

export function LangToggle({ className, compact }: Props) {
  const { lang, toggleLang } = useLang();
  const isHindi = lang === "hi";

  if (compact) {
    return (
      <button
        onClick={toggleLang}
        aria-label={isHindi ? "Switch to English" : "हिंदी में बदलें"}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          "bg-muted/80 hover:bg-muted border border-border/60",
          className
        )}
      >
        <span className={cn(
          "text-[11px] font-extrabold leading-none",
          isHindi ? "text-orange-500" : "text-slate-500 dark:text-slate-300"
        )}>
          {isHindi ? "हि" : "EN"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLang}
      aria-label={isHindi ? "Switch to English" : "हिंदी में बदलें"}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        "border border-border bg-muted/60 hover:bg-muted",
        "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <div className={cn(
        "relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0",
        isHindi ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-600"
      )}>
        <span className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center",
          isHindi ? "translate-x-4" : "translate-x-0"
        )}>
          <span className={cn(
            "text-[7px] font-extrabold leading-none",
            isHindi ? "text-orange-600" : "text-slate-500"
          )}>
            {isHindi ? "हि" : "EN"}
          </span>
        </span>
      </div>
      <span className="hidden sm:inline font-semibold tracking-wide">
        {isHindi ? "हिंदी" : "English"}
      </span>
    </button>
  );
}
