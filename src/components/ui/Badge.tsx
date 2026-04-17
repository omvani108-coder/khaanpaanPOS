import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      {...props}
    />
  );
}

/** FSSAI-standard veg/non-veg indicator icon */
export function VegIcon({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-sm border-[1.5px] flex-shrink-0"
      style={{ borderColor: isVeg ? "#27A84A" : "#C84B11" }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: isVeg ? "#27A84A" : "#C84B11" }}
      />
    </span>
  );
}
