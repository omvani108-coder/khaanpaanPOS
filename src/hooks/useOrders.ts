import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import type { OrderWithItems } from "@/types/db";

/** Today's orders for the given restaurant, plus realtime updates. */
export function useOrders(restaurantId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery<OrderWithItems[]>({
    queryKey: ["orders", restaurantId],
    enabled: Boolean(restaurantId) && supabaseConfigured,
    refetchInterval: 60_000,
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

  useEffect(() => {
    if (!restaurantId || !supabaseConfigured) return;
    const chan = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => qc.invalidateQueries({ queryKey: ["orders", restaurantId] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => qc.invalidateQueries({ queryKey: ["orders", restaurantId] })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(chan);
    };
  }, [restaurantId, qc]);

  return query;
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
    status === "preparing"
      ? "preparing_at"
      : status === "ready"
      ? "ready_at"
      : status === "served"
      ? "served_at"
      : status === "completed"
      ? "completed_at"
      : status === "cancelled"
      ? "cancelled_at"
      : null;

  const payload: Record<string, unknown> = { status };
  if (stampField) payload[stampField] = new Date().toISOString();

  const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
  if (error) throw error;
}
