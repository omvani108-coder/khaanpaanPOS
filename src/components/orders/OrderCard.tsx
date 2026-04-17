import { Clock, Utensils, Truck, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatINR, formatTime, elapsedLabel } from "@/lib/utils";
import { displayStatus, nextStatuses, statusClass, statusLabel } from "@/lib/orderStatus";
import type { OrderWithItems } from "@/types/db";

interface Props {
  order: OrderWithItems;
  onAdvance?: (orderId: string, to: "preparing" | "ready" | "served" | "completed") => void;
  onCancel?: (orderId: string) => void;
  onPrintBill?: (orderId: string) => void;
}

const sourceIcon = {
  dine_in:  Utensils,
  takeaway: Store,
  zomato:   Truck,
  swiggy:   Truck,
  phone:    Phone,
  other:    Store,
} as const;

export function OrderCard({ order, onAdvance, onCancel, onPrintBill }: Props) {
  const ds = displayStatus(order);
  const SourceIcon = sourceIcon[order.source] ?? Store;
  const nexts = nextStatuses[order.status];
  const isDelayedStatus = ds === "delayed";

  return (
    <div className={cn(
      "rounded-2xl bg-card border p-4 flex flex-col gap-3 transition-all shadow-card",
      isDelayedStatus ? "border-red-400/20" : "border-border/60"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-foreground">#{order.order_number}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <SourceIcon className="h-3.5 w-3.5" />
              {prettySource(order.source)}
            </span>
            {order.table && (
              <span className="text-xs font-semibold text-foreground/60 bg-slate-100 rounded-full px-2 py-0.5">
                {order.table.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(order.placed_at)}</span>
            <span>·</span>
            <span className={cn(isDelayedStatus && "text-red-400 font-semibold")}>
              {elapsedLabel(order.placed_at)} ago
            </span>
          </div>
        </div>
        <Badge className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusClass[ds])}>
          {statusLabel[ds]}
        </Badge>
      </div>

      {/* Items */}
      <ul className="space-y-1 text-sm">
        {order.items.map((it) => (
          <li key={it.id} className="flex justify-between gap-2">
            <span className="text-foreground/80">
              <span className="font-semibold text-foreground">{it.quantity}×</span> {it.name_snapshot}
              {it.notes && <span className="text-muted-foreground"> · {it.notes}</span>}
            </span>
            <span className="text-muted-foreground tabular-nums">{formatINR(it.price_snapshot * it.quantity)}</span>
          </li>
        ))}
      </ul>

      {/* Total */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total</span>
        <span className="font-bold text-foreground">{formatINR(order.total)}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {nexts.filter((s) => s !== "cancelled").map((s) => (
          <Button
            key={s}
            size="sm"
            variant="primary"
            onClick={() => onAdvance?.(order.id, s as "preparing" | "ready" | "served" | "completed")}
          >
            Mark {statusLabel[s]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(`/orders/${order.id}/kot`, "_blank")}
        >
          KOT
        </Button>
        {(order.status === "served" || order.status === "completed") && (
          <Button size="sm" variant="outline" onClick={() => onPrintBill?.(order.id)}>
            Print bill
          </Button>
        )}
        {nexts.includes("cancelled") && (
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => onCancel?.(order.id)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function prettySource(s: OrderWithItems["source"]): string {
  switch (s) {
    case "dine_in":  return "Dine-in";
    case "takeaway": return "Takeaway";
    case "zomato":   return "Zomato";
    case "swiggy":   return "Swiggy";
    case "phone":    return "Phone";
    default:         return "Other";
  }
}
