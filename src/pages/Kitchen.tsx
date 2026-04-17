/**
 * Kitchen Display System (KDS) — /kitchen
 *
 * Full-screen tablet view for kitchen staff.
 * - Shows pending + preparing orders in real-time
 * - Color urgency: green (fresh) → amber (approaching SLA) → red (delayed)
 * - One-tap "Start" and "Ready" buttons
 * - Auto-refreshes every 15s + Supabase Realtime
 * - No sidebar, no auth wall — just open /kitchen on a kitchen tablet
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChefHat, Clock, RefreshCw, Utensils, Users } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { updateOrderStatus } from "@/hooks/useOrders";
import { cn, elapsedLabel } from "@/lib/utils";
import type { OrderWithItems } from "@/types/db";

const REFRESH_MS = 15_000;

// ── mock data for demo mode ───────────────────────────────────────────────────
const DEMO_ORDERS: OrderWithItems[] = [
  {
    id: "d1", restaurant_id: "r1", order_number: 42, source: "dine_in",
    table_id: "t1", customer_name: null, customer_phone: null, aggregator_ref: null,
    status: "pending", sla_minutes: 20, notes: null,
    subtotal: 580, tax: 52, discount: 0, total: 632,
    placed_at: new Date(Date.now() - 4 * 60_000).toISOString(),
    preparing_at: null, ready_at: null, served_at: null,
    completed_at: null, cancelled_at: null, created_at: new Date().toISOString(),
    items: [
      { id: "i1", order_id: "d1", menu_item_id: null, name_snapshot: "Butter Chicken", price_snapshot: 320, quantity: 1, notes: "Extra gravy", created_at: "" },
      { id: "i2", order_id: "d1", menu_item_id: null, name_snapshot: "Garlic Naan", price_snapshot: 60, quantity: 4, notes: null, created_at: "" },
    ],
    table: { id: "t1", restaurant_id: "r1", label: "T-3", seats: 4, qr_token: "", is_active: true, assigned_waiter_id: null, created_at: "" },
  },
  {
    id: "d2", restaurant_id: "r1", order_number: 43, source: "dine_in",
    table_id: "t2", customer_name: null, customer_phone: null, aggregator_ref: null,
    status: "preparing", sla_minutes: 20, notes: "No onion in Dal",
    subtotal: 420, tax: 38, discount: 0, total: 458,
    placed_at: new Date(Date.now() - 14 * 60_000).toISOString(),
    preparing_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    ready_at: null, served_at: null, completed_at: null, cancelled_at: null, created_at: new Date().toISOString(),
    items: [
      { id: "i3", order_id: "d2", menu_item_id: null, name_snapshot: "Dal Makhani", price_snapshot: 220, quantity: 1, notes: "No onion", created_at: "" },
      { id: "i4", order_id: "d2", menu_item_id: null, name_snapshot: "Steamed Rice", price_snapshot: 100, quantity: 2, notes: null, created_at: "" },
    ],
    table: { id: "t2", restaurant_id: "r1", label: "T-7", seats: 2, qr_token: "", is_active: true, assigned_waiter_id: null, created_at: "" },
  },
  {
    id: "d3", restaurant_id: "r1", order_number: 41, source: "takeaway",
    table_id: null, customer_name: "Rahul Sharma", customer_phone: "9876543210", aggregator_ref: null,
    status: "pending", sla_minutes: 15, notes: null,
    subtotal: 280, tax: 25, discount: 0, total: 305,
    placed_at: new Date(Date.now() - 18 * 60_000).toISOString(),
    preparing_at: null, ready_at: null, served_at: null, completed_at: null, cancelled_at: null, created_at: new Date().toISOString(),
    items: [
      { id: "i5", order_id: "d3", menu_item_id: null, name_snapshot: "Paneer Tikka", price_snapshot: 280, quantity: 1, notes: null, created_at: "" },
    ],
    table: null,
  },
];

export default function KitchenPage() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const qc = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ordersQ = useQuery<OrderWithItems[]>({
    queryKey: ["kds_orders", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, table:restaurant_tables(id,label,seats,qr_token,is_active,assigned_waiter_id,restaurant_id,created_at), items:order_items(*)")
        .eq("restaurant_id", rid!)
        .in("status", ["pending", "preparing"])
        .order("placed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OrderWithItems[];
    },
  });

  // Auto-refresh
  useEffect(() => {
    timerRef.current = setInterval(() => {
      void qc.invalidateQueries({ queryKey: ["kds_orders", rid] });
      setLastRefresh(new Date());
    }, REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [rid, qc]);

  // Realtime subscription
  useEffect(() => {
    if (!rid || !supabaseConfigured) return;
    const ch = supabase
      .channel(`kds-orders-${rid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${rid}` }, () => {
        void qc.invalidateQueries({ queryKey: ["kds_orders", rid] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [rid, qc]);

  async function advance(orderId: string, to: "preparing" | "ready") {
    try {
      await updateOrderStatus(orderId, to);
      void qc.invalidateQueries({ queryKey: ["kds_orders", rid] });
      toast.success(to === "preparing" ? "Started cooking" : "Marked ready!");
    } catch (e) { toast.error((e as Error).message); }
  }

  const orders = supabaseConfigured ? (ordersQ.data ?? []) : DEMO_ORDERS;
  const pending   = orders.filter((o) => o.status === "pending");
  const preparing = orders.filter((o) => o.status === "preparing");

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-5 h-14 border-b border-white/8 bg-slate-900 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gold-500 flex items-center justify-center shadow-gold-glow">
          <ChefHat className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm">Kitchen Display</span>
          <span className="text-white/40 text-xs ml-2">· {restaurant?.name ?? "Demo Kitchen"}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-white/30">
            <Clock className="inline h-3 w-3 mr-1" />
            {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => { void qc.invalidateQueries({ queryKey: ["kds_orders", rid] }); setLastRefresh(new Date()); }}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", ordersQ.isFetching && "animate-spin")} />
          </button>
        </div>
        {/* Counters */}
        <div className="flex gap-3 ml-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-400 font-semibold">
            {pending.length} Pending
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-400/15 text-blue-400 font-semibold">
            {preparing.length} Cooking
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Pending column */}
        <div className="flex-1 border-r border-white/8 overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/8 bg-amber-400/8">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">
              New Orders ({pending.length})
            </h2>
          </div>
          <div className="p-3 space-y-3">
            {pending.length === 0 && (
              <div className="text-center py-16 text-white/20">
                <Utensils className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No pending orders</p>
              </div>
            )}
            {pending.map((o) => (
              <KDSCard key={o.id} order={o} onAction={() => advance(o.id, "preparing")} actionLabel="Start cooking" actionColor="amber" />
            ))}
          </div>
        </div>

        {/* Cooking column */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/8 bg-blue-400/8">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest">
              Cooking ({preparing.length})
            </h2>
          </div>
          <div className="p-3 space-y-3">
            {preparing.length === 0 && (
              <div className="text-center py-16 text-white/20">
                <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nothing cooking yet</p>
              </div>
            )}
            {preparing.map((o) => (
              <KDSCard key={o.id} order={o} onAction={() => advance(o.id, "ready")} actionLabel="Mark ready" actionColor="emerald" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KDS Card ─────────────────────────────────────────────────────────────────

function KDSCard({
  order,
  onAction,
  actionLabel,
  actionColor,
}: {
  order: OrderWithItems;
  onAction: () => void;
  actionLabel: string;
  actionColor: "amber" | "emerald";
}) {
  const [elapsed, setElapsed] = useState(() => getElapsedMin(order.placed_at));

  useEffect(() => {
    const t = setInterval(() => setElapsed(getElapsedMin(order.placed_at)), 10_000);
    return () => clearInterval(t);
  }, [order.placed_at]);

  const pct = elapsed / order.sla_minutes;
  const urgency =
    pct >= 1 ? "red" :
    pct >= 0.75 ? "amber" :
    "green";

  const urgencyBorder = { red: "border-red-500/60", amber: "border-amber-400/50", green: "border-emerald-500/40" }[urgency];
  const urgencyBg     = { red: "bg-red-500/8",      amber: "bg-amber-400/5",      green: "bg-emerald-500/5"     }[urgency];
  const urgencyText   = { red: "text-red-400",       amber: "text-amber-400",      green: "text-emerald-400"     }[urgency];
  const urgencyDot    = { red: "bg-red-500 animate-pulse", amber: "bg-amber-400", green: "bg-emerald-500" }[urgency];

  return (
    <div className={cn("rounded-2xl border p-4 space-y-3", urgencyBorder, urgencyBg)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", urgencyDot)} />
          <span className="font-black text-xl text-white">#{order.order_number}</span>
          {order.table ? (
            <span className="flex items-center gap-1 text-xs text-white/50 font-medium">
              <Users className="h-3 w-3" /> {order.table.label}
            </span>
          ) : order.customer_name ? (
            <span className="text-xs text-white/50 font-medium">{order.customer_name}</span>
          ) : (
            <span className="text-xs text-white/30">Takeaway</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className={cn("h-3.5 w-3.5", urgencyText)} />
          <span className={cn("text-sm font-bold tabular-nums", urgencyText)}>
            {elapsedLabel(order.placed_at)}
          </span>
          <span className="text-xs text-white/25">/ {order.sla_minutes}m</span>
        </div>
      </div>

      {/* Items */}
      <ul className="space-y-1.5">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-start gap-2">
            <span className="text-white font-black text-base leading-none w-5 text-right flex-shrink-0">
              {it.quantity}×
            </span>
            <div className="min-w-0">
              <span className="text-white text-sm font-semibold">{it.name_snapshot}</span>
              {it.notes && (
                <div className="text-xs text-amber-300 mt-0.5">⚠ {it.notes}</div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Notes on order */}
      {order.notes && (
        <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-2 text-xs text-amber-300">
          Note: {order.notes}
        </div>
      )}

      {/* SLA bar */}
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", {
            "bg-emerald-500": urgency === "green",
            "bg-amber-400":   urgency === "amber",
            "bg-red-500":     urgency === "red",
          })}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>

      {/* Action */}
      <button
        onClick={onAction}
        className={cn(
          "w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]",
          actionColor === "amber"
            ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
            : "bg-emerald-500 text-white hover:bg-emerald-400"
        )}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function getElapsedMin(placedAt: string): number {
  return (Date.now() - new Date(placedAt).getTime()) / 60_000;
}
