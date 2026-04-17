import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { updateOrderStatus, useOrders } from "@/hooks/useOrders";
import { useNewOrders } from "@/contexts/NewOrderContext";
import { OrderCard } from "@/components/orders/OrderCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { displayStatus } from "@/lib/orderStatus";
import { supabase } from "@/lib/supabaseClient";
import { nextInvoiceNumber } from "@/lib/utils";
import type { OrderWithItems } from "@/types/db";

type Filter = "active" | "pending" | "preparing" | "ready" | "served" | "completed" | "delayed";

const tabs: { key: Filter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "served", label: "Served" },
  { key: "delayed", label: "Delayed" },
  { key: "completed", label: "Completed" },
];

export default function OrdersPage() {
  const { restaurant } = useAuth();
  const { data: orders = [], refetch } = useOrders(restaurant?.id);
  const { clearNewOrders } = useNewOrders();
  const [filter, setFilter] = useState<Filter>("active");

  // Clear badge when orders page mounts
  useEffect(() => { clearNewOrders(); }, [clearNewOrders]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return orders.filter((o) => ["pending", "preparing", "ready", "served"].includes(o.status));
      case "delayed":
        return orders.filter((o) => displayStatus(o) === "delayed");
      default:
        return orders.filter((o) => o.status === filter);
    }
  }, [orders, filter]);

  async function handleAdvance(id: string, to: "preparing" | "ready" | "served" | "completed") {
    try {
      await updateOrderStatus(id, to);
      toast.success(`Order marked ${to}`);
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this order?")) return;
    try {
      await updateOrderStatus(id, "cancelled");
      toast.success("Order cancelled");
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handlePrintBill(orderId: string) {
    if (!restaurant) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    try {
      // Create invoice if not exists, then navigate to print view
      const { data: existing } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      let invoiceId = existing?.id as string | undefined;

      if (!invoiceId) {
        const { data: last } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("restaurant_id", restaurant.id)
          .order("issued_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextNum = nextInvoiceNumber(restaurant.invoice_prefix, last?.invoice_number);
        const { data, error } = await supabase
          .from("invoices")
          .insert({
            restaurant_id: restaurant.id,
            order_id: orderId,
            invoice_number: nextNum,
            subtotal: order.subtotal,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
          })
          .select()
          .single();
        if (error) throw error;
        invoiceId = data.id;
      }
      window.open(`/bills/${invoiceId}/print`, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <div className="text-sm text-muted-foreground">{orders.length} today</div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const count = countFor(orders, t.key);
          return (
            <Button
              key={t.key}
              variant={filter === t.key ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter(t.key)}
              className={cn("shrink-0")}
            >
              {t.label}
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  filter === t.key ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No orders in this view.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onAdvance={handleAdvance}
              onCancel={handleCancel}
              onPrintBill={handlePrintBill}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countFor(orders: OrderWithItems[], key: Filter): number {
  switch (key) {
    case "active":
      return orders.filter((o) => ["pending", "preparing", "ready", "served"].includes(o.status)).length;
    case "delayed":
      return orders.filter((o) => displayStatus(o) === "delayed").length;
    default:
      return orders.filter((o) => o.status === key).length;
  }
}
