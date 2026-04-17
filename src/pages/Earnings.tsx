/**
 * Earnings — /earnings
 * Shows daily revenue summary. Browse by date with prev/next arrows.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, TrendingUp, ShoppingBag, IndianRupee, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

function toLocalDateStr(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD in local time (approx)
}

function startOf(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toISOString();
}
function endOf(dateStr: string) {
  return new Date(dateStr + "T23:59:59.999").toISOString();
}
function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

interface OrderRow {
  id: string;
  order_number: number;
  total: number;
  status: string;
  source: string;
  payment_method: string | null;
  placed_at: string;
  customer_name: string | null;
  table: { label: string } | null;
}

const methodColor: Record<string, string> = {
  cash:  "bg-emerald-100 text-emerald-800",
  upi:   "bg-blue-100 text-blue-800",
  card:  "bg-purple-100 text-purple-800",
};

export default function EarningsPage() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const today = toLocalDateStr(new Date());
  const [dateStr, setDateStr] = useState(today);

  const isToday = dateStr === today;

  function prevDay() {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setDateStr(toLocalDateStr(d));
  }
  function nextDay() {
    if (isToday) return;
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setDateStr(toLocalDateStr(d));
  }

  const q = useQuery<OrderRow[]>({
    queryKey: ["earnings", rid, dateStr],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, status, source, payment_method, placed_at, customer_name, table:restaurant_tables(label)")
        .eq("restaurant_id", rid!)
        .eq("status", "completed")
        .gte("placed_at", startOf(dateStr))
        .lte("placed_at", endOf(dateStr))
        .order("placed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const orders = q.data ?? [];
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders  = orders.length;
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const byMethod: Record<string, number> = {};
  for (const o of orders) {
    const m = o.payment_method ?? "unpaid";
    byMethod[m] = (byMethod[m] ?? 0) + Number(o.total);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
          <p className="text-sm text-muted-foreground">Daily revenue summary</p>
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevDay}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-foreground">{formatDisplayDate(dateStr)}</div>
          {isToday && <div className="text-xs text-gold-600 font-medium">Today</div>}
        </div>
        <button
          onClick={nextDay}
          disabled={isToday}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-gold-500/10 text-gold-600 ring-1 ring-gold-300 flex-shrink-0">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold">{formatINR(totalRevenue)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 ring-1 ring-blue-200 flex-shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Orders</div>
              <div className="text-xl font-bold">{totalOrders}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 flex-shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg order</div>
              <div className="text-xl font-bold">{formatINR(avgOrder)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="rounded-xl p-2.5 bg-purple-50 text-purple-600 ring-1 ring-purple-200 flex-shrink-0 mt-0.5">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground mb-1">By payment</div>
              {Object.keys(byMethod).length === 0
                ? <div className="text-sm text-muted-foreground">—</div>
                : Object.entries(byMethod).map(([m, amt]) => (
                  <div key={m} className="flex items-center gap-1.5 text-xs">
                    <span className={`px-1.5 py-0.5 rounded-full capitalize font-medium ${methodColor[m] ?? "bg-zinc-100 text-zinc-700"}`}>{m}</span>
                    <span className="font-semibold">{formatINR(amt)}</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order list */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Completed Orders
        </h2>
        {q.isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No completed orders on this day.
          </div>
        ) : (
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">#{o.order_number}</span>
                    {o.table && (
                      <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{o.table.label}</span>
                    )}
                    {o.customer_name && (
                      <span className="text-xs text-muted-foreground truncate">{o.customer_name}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(o.placed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    <span className="capitalize">{o.source.replace("_", " ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {o.payment_method && (
                    <Badge className={`text-xs capitalize ${methodColor[o.payment_method] ?? "bg-zinc-100 text-zinc-700"}`}>
                      {o.payment_method}
                    </Badge>
                  )}
                  <span className="font-bold">{formatINR(o.total)}</span>
                  <Link
                    to={`/bills/${o.id}/print`}
                    target="_blank"
                    className="text-muted-foreground hover:text-gold-600 transition-colors"
                    title="Print bill"
                  >
                    <Receipt className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
