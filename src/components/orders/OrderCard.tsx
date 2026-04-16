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
  dine_in: Utensils,
  takeaway: Store,
  zomato: Truck,
  swiggy: Truck,
  phone: Phone,
  other: Store,
} as const;

export function OrderCard({ order, onAdvance, onCancel, onPrintBill }: Props) {
  const ds = displayStatus(order);
  const SourceIcon = sourceIcon[order.source] ?? Store;
  const nexts = nextStatuses[order.status];

  return (
    <div className="rounded-lg border bg-card shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-base">#{order.order_number}</span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <SourceIcon className="h-3.5 w-3.5" />
              {prettySource(order.source)}
            </span>
            {order.table && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">{order.table.label}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(order.placed_at)}</span>
            <span>•</span>
            <span className={cn(ds === "delayed" && "text-red-600 font-semibold")}>
              {elapsedLabel(order.placed_at)} ago
            </span>
          </div>
        </div>
        <Badge className={statusClass[ds]}>{statusLabel[ds]}</Badge>
      </div>

      <ul className="text-sm space-y-1">
        {order.items.map((it) => (
          <li key={it.id} className="flex justify-between gap-2">
            <span>
              <span className="font-medium">{it.quantity}×</span> {it.name_snapshot}
              {it.notes && <span className="text-muted-foreground"> — {it.notes}</span>}
            </span>
            <span className="text-muted-foreground">{formatINR(it.price_snapshot * it.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="font-bold">{formatINR(order.total)}</span>
      </div>

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
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onCancel?.(order.id)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function prettySource(s: OrderWithItems["source"]): string {
  switch (s) {
    case "dine_in":
      return "Dine-in";
    case "takeaway":
      return "Takeaway";
    case "zomato":
      return "Zomato";
    case "swiggy":
      return "Swiggy";
    case "phone":
      return "Phone";
    default:
      return "Other";
  }
}
