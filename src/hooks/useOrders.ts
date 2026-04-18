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

type OrderStatus = "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled";

/**
 * Valid predecessor statuses for each target status — enforces that we can only
 * advance through the lifecycle (or cancel from an active state). This is the
 * concurrency guard: two users both trying to transition the same order will
 * race, but only ONE can win because the second update's `.in("status", ...)`
 * filter will no longer match the row.
 */
const VALID_FROM: Record<OrderStatus, OrderStatus[]> = {
  pending:   [],                                                  // initial state only
  preparing: ["pending"],
  ready:     ["pending", "preparing"],
  served:    ["pending", "preparing", "ready"],
  completed: ["pending", "preparing", "ready", "served"],
  cancelled: ["pending", "preparing", "ready"],
};

/** Update order status with optimistic concurrency — throws if state changed underneath us. */
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const stampField =
    status === "preparing" ? "preparing_at"
    : status === "ready"   ? "ready_at"
    : status === "served"  ? "served_at"
    : status === "completed" ? "completed_at"
    : status === "cancelled" ? "cancelled_at"
    : null;

  const payload: Record<string, unknown> = { status };
  if (stampField) payload[stampField] = new Date().toISOString();

  const validFrom = VALID_FROM[status];
  let q = supabase.from("orders").update(payload).eq("id", orderId);
  if (validFrom.length) q = q.in("status", validFrom);

  // Use .select() to get the updated row back — if no row matched (because
  // status was already advanced by another user), data will be empty.
  const { data, error } = await q.select("id, status");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "This order was just updated by someone else. Please refresh to see the latest status."
    );
  }
}
