/**
 * Captain App — waiter-facing mobile view.
 * Accessed at /captain (full table list) or /captain/:tableId (specific table).
 *
 * Flow:
 *   1. Waiter sees all tables with live status.
 *   2. Tap a table → browse menu, add items, place order.
 *   3. Can also advance order status (pending → preparing → ready → served).
 *   4. Can mark payment and print bill.
 *
 * Uses the same Supabase client as the staff app — requires auth.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock,
  Leaf,
  Beef,
  Minus,
  Plus,
  ShoppingCart,
  Users,
  Printer,
} from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, updateOrderStatus } from "@/hooks/useOrders";
import { Button } from "@/components/ui/Button";
import { cn, elapsedLabel, formatINR, nextInvoiceNumber } from "@/lib/utils";
import { displayStatus, nextStatuses, statusClass, statusLabel } from "@/lib/orderStatus";
import { WaiterNotification } from "@/components/orders/WaiterNotification";
import type { MenuCategory, MenuItem, OrderWithItems, RestaurantTable } from "@/types/db";

// ─── top-level view state ────────────────────────────────────────────────────
type View =
  | { kind: "tables" }
  | { kind: "table_detail"; table: RestaurantTable }
  | { kind: "new_order"; table: RestaurantTable };

export default function CaptainAppPage() {
  const { restaurant, staff } = useAuth();
  const rid = restaurant?.id;
  const qc = useQueryClient();
  const [view, setView] = useState<View>({ kind: "tables" });
  const [notification, setNotification] = useState<OrderWithItems | null>(null);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  // Tables
  const tablesQ = useQuery<RestaurantTable[]>({
    queryKey: ["tables", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", rid!)
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      return (data ?? []) as RestaurantTable[];
    },
  });

  // Menu
  const menuCatsQ = useQuery<MenuCategory[]>({
    queryKey: ["menu_categories", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", rid!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as MenuCategory[];
    },
  });

  const menuItemsQ = useQuery<MenuItem[]>({
    queryKey: ["menu_items", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", rid!)
        .eq("is_available", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as MenuItem[];
    },
  });

  const { data: orders = [], refetch: refetchOrders } = useOrders(rid);

  // ── Waiter notification: detect new orders on assigned tables ────────────
  useEffect(() => {
    if (!staff || !tablesQ.data) return;
    const myTableIds = new Set(
      tablesQ.data.filter((t) => t.assigned_waiter_id === staff.id).map((t) => t.id)
    );
    const newOrders = orders.filter(
      (o) =>
        !prevOrderIdsRef.current.has(o.id) &&
        o.table_id != null &&
        myTableIds.has(o.table_id) &&
        o.status === "pending"
    );
    if (newOrders.length > 0) setNotification(newOrders[0]);
    prevOrderIdsRef.current = new Set(orders.map((o) => o.id));
  }, [orders, staff, tablesQ.data]);

  const activeByTable = useMemo(() => {
    const map = new Map<string, OrderWithItems[]>();
    for (const o of orders) {
      if (!o.table_id || ["completed", "cancelled"].includes(o.status)) continue;
      if (!map.has(o.table_id)) map.set(o.table_id, []);
      map.get(o.table_id)!.push(o);
    }
    return map;
  }, [orders]);

  // ── advance order status ──
  async function handleAdvance(
    orderId: string,
    to: "preparing" | "ready" | "served" | "completed"
  ) {
    try {
      await updateOrderStatus(orderId, to);
      toast.success(`Marked ${to}`);
      void refetchOrders();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ── place new order from captain ──
  async function placeOrder(
    tableId: string,
    cart: Record<string, number>,
    byId: Record<string, MenuItem>
  ) {
    if (!rid || !restaurant) return;
    const tax_percent = restaurant.tax_percent;
    const subtotal = Object.entries(cart).reduce(
      (s, [id, q]) => s + (byId[id]?.price ?? 0) * q,
      0
    );
    const tax = Math.round(subtotal * tax_percent) / 100;
    const total = subtotal + tax;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        restaurant_id: rid,
        source: "dine_in",
        table_id: tableId,
        status: "pending",
        subtotal,
        tax,
        total,
      })
      .select()
      .single();
    if (error) throw error;

    const lines = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuId, qty]) => ({
        order_id: order.id,
        menu_item_id: menuId,
        name_snapshot: byId[menuId].name,
        price_snapshot: byId[menuId].price,
        quantity: qty,
      }));
    const { error: iErr } = await supabase.from("order_items").insert(lines);
    if (iErr) throw iErr;

    void qc.invalidateQueries({ queryKey: ["orders", rid] });
    return order.id as string;
  }

  // ── print bill helper ──
  async function printBill(orderId: string) {
    if (!restaurant) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    try {
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      let invId = existing?.id as string | undefined;
      if (!invId) {
        const { data: last } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("restaurant_id", restaurant.id)
          .order("issued_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const num = nextInvoiceNumber(restaurant.invoice_prefix, last?.invoice_number);
        const { data, error } = await supabase
          .from("invoices")
          .insert({
            restaurant_id: restaurant.id,
            order_id: orderId,
            invoice_number: num,
            subtotal: order.subtotal,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
          })
          .select()
          .single();
        if (error) throw error;
        invId = data.id;
      }
      window.open(`/bills/${invId}/print`, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ── render ──
  return (
    <div className="min-h-screen bg-background pb-4">
      {notification && (
        <WaiterNotification order={notification} onDismiss={() => setNotification(null)} />
      )}
      {/* Top bar */}
      <header className="px-4 h-14 flex items-center gap-3 sticky top-0 z-30 no-print bg-white border-b border-border">
        {view.kind !== "tables" && (
          <button
            onClick={() => setView({ kind: "tables" })}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="w-7 h-7 rounded-lg bg-gold-500 flex items-center justify-center flex-shrink-0 shadow-gold-glow">
          <ChefHat className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground leading-none">Captain App</div>
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
            {restaurant?.name ?? "Restaurant"} · {staff?.display_name ?? "Waiter"}
          </div>
        </div>
        {view.kind === "table_detail" && (
          <Button
            size="sm"
            variant="primary"
            className="shrink-0"
            onClick={() => setView({ kind: "new_order", table: view.table })}
          >
            <Plus className="h-4 w-4" /> New order
          </Button>
        )}
      </header>

      <div className="px-4 pt-4">
        {view.kind === "tables" && (
          <TablesView
            tables={tablesQ.data ?? []}
            activeByTable={activeByTable}
            staffId={staff?.id ?? null}
            onSelectTable={(t) => setView({ kind: "table_detail", table: t })}
          />
        )}

        {view.kind === "table_detail" && (
          <TableDetailView
            table={view.table}
            orders={activeByTable.get(view.table.id) ?? []}
            onAdvance={handleAdvance}
            onPrintBill={printBill}
            onNewOrder={() => setView({ kind: "new_order", table: view.table })}
          />
        )}

        {view.kind === "new_order" && (
          <NewOrderView
            table={view.table}
            categories={menuCatsQ.data ?? []}
            items={menuItemsQ.data ?? []}
            onPlace={async (cart, byId) => {
              try {
                await placeOrder(view.table.id, cart, byId);
                toast.success("Order placed!");
                setView({ kind: "table_detail", table: view.table });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            onCancel={() => setView({ kind: "table_detail", table: view.table })}
          />
        )}
      </div>
    </div>
  );
}

// ─── sub-views ───────────────────────────────────────────────────────────────

function TablesView({
  tables,
  activeByTable,
  staffId,
  onSelectTable,
}: {
  tables: RestaurantTable[];
  activeByTable: Map<string, OrderWithItems[]>;
  staffId: string | null;
  onSelectTable: (t: RestaurantTable) => void;
}) {
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const myTables = tables.filter((t) => t.assigned_waiter_id === staffId);
  const displayed = filter === "mine" && myTables.length > 0 ? myTables : tables;

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["mine", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
              filter === f
                ? "bg-gold-500/10 text-gold-600 ring-1 ring-gold-300"
                : "bg-slate-100 text-slate-500 hover:text-slate-700"
            )}
          >
            {f === "mine"
              ? `My Tables ${myTables.length > 0 ? `(${myTables.length})` : ""}`
              : `All (${tables.length})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <p className="text-muted-foreground text-sm py-4 text-center">
          {filter === "mine" ? "No tables assigned to you yet." : "No tables set up."}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {displayed.map((t) => {
          const tableOrders = activeByTable.get(t.id) ?? [];
          const topOrder = tableOrders[0] ?? null;
          const ds = topOrder ? displayStatus(topOrder) : null;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTable(t)}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition active:scale-95",
                tableOrders.length > 0
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <div className="font-black text-xl">{t.label}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {t.seats}
              </div>
              {ds && topOrder ? (
                <div className="mt-2 space-y-1">
                  <span className={cn("text-[10px] rounded-full px-2 py-0.5 font-semibold", statusClass[ds])}>
                    {statusLabel[ds]}
                  </span>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{elapsedLabel(topOrder.placed_at)}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-emerald-600 font-medium">Free</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableDetailView({
  table,
  orders,
  onAdvance,
  onPrintBill,
  onNewOrder,
}: {
  table: RestaurantTable;
  orders: OrderWithItems[];
  onAdvance: (id: string, to: "preparing" | "ready" | "served" | "completed") => void;
  onPrintBill: (id: string) => void;
  onNewOrder: () => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-xl">Table {table.label}</h2>
        <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
          <div className="text-muted-foreground">No active orders.</div>
          <Button onClick={onNewOrder}>
            <Plus className="h-4 w-4" /> Take order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-xl">Table {table.label}</h2>
      {orders.map((o) => {
        const ds = displayStatus(o);
        const nexts = nextStatuses[o.status].filter((s) => s !== "cancelled");
        return (
          <div key={o.id} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold">Order #{o.order_number}</span>
              <span className={cn("text-xs rounded-full px-2.5 py-1 font-semibold", statusClass[ds])}>
                {statusLabel[ds]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {elapsedLabel(o.placed_at)} ago
            </div>

            <ul className="divide-y text-sm">
              {o.items.map((it) => (
                <li key={it.id} className="py-1 flex justify-between">
                  <span><span className="font-semibold">{it.quantity}×</span> {it.name_snapshot}</span>
                  <span className="text-muted-foreground">{formatINR(it.price_snapshot * it.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatINR(o.total)}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {nexts.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  onClick={() => onAdvance(o.id, s as "preparing" | "ready" | "served" | "completed")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark {statusLabel[s]}
                </Button>
              ))}
              {(o.status === "served" || o.status === "completed") && (
                <Button size="sm" variant="outline" onClick={() => onPrintBill(o.id)}>
                  <Printer className="h-4 w-4" /> Bill
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewOrderView({
  table,
  categories,
  items,
  onPlace,
  onCancel,
}: {
  table: RestaurantTable;
  categories: MenuCategory[];
  items: MenuItem[];
  onPlace: (cart: Record<string, number>, byId: Record<string, MenuItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);

  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const subtotal = Object.entries(cart).reduce(
    (s, [id, q]) => s + (byId[id]?.price ?? 0) * q,
    0
  );

  const grouped = useMemo(() => {
    const cats = categories.map((c) => ({
      id: c.id,
      name: c.name,
      items: items.filter((i) => i.category_id === c.id),
    }));
    const uncat = items.filter((i) => !i.category_id);
    if (uncat.length) cats.push({ id: "uncat", name: "Other", items: uncat });
    return cats.filter((g) => g.items.length > 0);
  }, [categories, items]);

  async function submit() {
    if (cartCount === 0) return;
    setPlacing(true);
    try {
      await onPlace(cart, byId);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-4 pb-32">
      <h2 className="font-bold text-xl">New order — Table {table.label}</h2>

      {grouped.map((g) => (
        <section key={g.id}>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">{g.name}</h3>
          <ul className="space-y-2">
            {g.items.map((it) => {
              const q = cart[it.id] ?? 0;
              return (
                <li key={it.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {it.is_veg
                      ? <Leaf className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                      : <Beef className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{it.name}</div>
                      <div className="text-sm font-semibold">{formatINR(it.price)}</div>
                    </div>
                  </div>
                  {q === 0 ? (
                    <Button size="sm" onClick={() => setCart((c) => ({ ...c, [it.id]: 1 }))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => setCart((c) => {
                          const next = { ...c };
                          if ((next[it.id] ?? 0) <= 1) delete next[it.id];
                          else next[it.id]--;
                          return next;
                        })}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold w-5 text-center">{q}</span>
                      <Button size="sm" onClick={() => setCart((c) => ({ ...c, [it.id]: (c[it.id] ?? 0) + 1 }))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 bg-card border-t p-3 space-y-2 z-30">
        <div className="max-w-lg mx-auto space-y-2">
          {cartCount > 0 && (
            <div className="flex justify-between text-sm font-medium">
              <span>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
              <span>{formatINR(subtotal)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={cartCount === 0 || placing} onClick={submit}>
              <ShoppingCart className="h-4 w-4" />
              Place order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
