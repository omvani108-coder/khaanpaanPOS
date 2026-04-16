import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:   "text-[hsl(38_60%_96%)] border border-[hsl(43_74%_35%)] hover:brightness-110 active:scale-[0.98]",
  secondary: "bg-secondary text-secondary-foreground border border-[hsl(43_74%_72%)] hover:bg-secondary/80",
  ghost:     "hover:bg-accent hover:text-accent-foreground",
  danger:    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline:   "border border-[hsl(38_25%_75%)] bg-background hover:bg-accent hover:border-[hsl(43_74%_55%)] hover:text-accent-foreground",
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(180deg, hsl(18 85% 46%) 0%, hsl(18 85% 38%) 100%)",
    boxShadow: "inset 0 1px 0 hsl(43 74% 60% / 0.4), 0 2px 4px hsl(18 85% 20% / 0.3)",
  },
  secondary: {},
  ghost: {},
  danger: {},
  outline: {},
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", style, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    />
  );
});
