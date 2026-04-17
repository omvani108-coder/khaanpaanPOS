import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useNewOrders } from "@/contexts/NewOrderContext";
import type { OrderWithItems } from "@/types/db";

/**
 * Fetches today's orders for a restaurant via React Query (polling every 30s).
 * Realtime subscription is handled ONCE by GlobalOrderWatcher in AppLayout —
 * this hook must NOT create its own channel to avoid duplicate-channel crashes.
 */
export function useOrders(restaurantId: string | undefined) {
  const { notifyNewOrders } = useNewOrders();
  const initializedRef = useRef(false);
  const qc = useQueryClient();

  const query = useQuery<OrderWithItems[]>({
    queryKey: ["orders", restaurantId],
    enabled: Boolean(restaurantId) && supabaseConfigured,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*), table:restaurant_tables(*)")
        .eq("restaurant_id", restaurantId)
        .gte("placed_at", startOfTodayIso())
        .order("placed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrderWithItems[];
    },
  });

  // Notify new-order context when pending count grows
  useEffect(() => {
    if (!query.data) return;
    const pendingCount = query.data.filter((o) =>
      ["pending", "preparing", "ready"].includes(o.status)
    ).length;
    if (!initializedRef.current) {
      initializedRef.current = true;
      notifyNewOrders(pendingCount);
      return;
    }
    notifyNewOrders(pendingCount);
  }, [query.data, notifyNewOrders]);

  return {
    ...query,
    refetch: () => qc.invalidateQueries({ queryKey: ["orders", restaurantId] }),
  };
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Update order status, writing the appropriate timestamp as a side effect. */
export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled"
) {
  const stampField =
    status === "preparing" ? "preparing_at"
    : status === "ready"   ? "ready_at"
    : status === "served"  ? "served_at"
    : status === "completed" ? "completed_at"
    : status === "cancelled" ? "cancelled_at"
    : null;

  const payload: Record<string, unknown> = { status };
  if (stampField) payload[stampField] = new Date().toISOString();

  const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
  if (error) throw error;
}
