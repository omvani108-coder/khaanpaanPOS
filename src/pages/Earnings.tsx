/**
 * Earnings — /earnings
 * Shows ALL completed orders for the day.
 * Orders with bills show invoice details + print link.
 * Orders without bills show a "Generate Bill" button.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, TrendingUp, ShoppingBag, IndianRupee, Receipt, FilePlus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { formatINR, nextInvoiceNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOf(dateStr: string) { return new Date(dateStr + "T00:00:00").toISOString(); }
function endOf(dateStr: string)   { return new Date(dateStr + "T23:59:59.999").toISOString(); }
function formatDisplayDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

interface OrderRow {
  id: string;
  order_number: number;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  source: string;
  customer_name: string | null;
  placed_at: string;
  table: { label: string } | null;
}

interface InvoiceRow {
  id: string;
  order_id: string;
  invoice_number: string;
  payment_status: string;
  payment_method: string | null;
  total: number;
  issued_at: string;
}

const methodColor: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-800",
  upi:  "bg-blue-100 text-blue-800",
  card: "bg-purple-100 text-purple-800",
};

export default function EarningsPage() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const qc = useQueryClient();
  const today = toLocalDateStr(new Date());
  const [dateStr, setDateStr] = useState(today);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const isToday = dateStr === today;

  function prevDay() {
    const d = new Date(dateStr + "T12:00:00"); d.setDate(d.getDate() - 1);
    setDateStr(toLocalDateStr(d));
  }
  function nextDay() {
    if (isToday) return;
    const d = new Date(dateStr + "T12:00:00"); d.setDate(d.getDate() + 1);
    setDateStr(toLocalDateStr(d));
  }

  // Fetch all completed orders for the day
  const ordersQ = useQuery<OrderRow[]>({
    queryKey: ["earnings_orders", rid, dateStr],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, subtotal, tax, discount, source, customer_name, placed_at, table:restaurant_tables(label)")
        .eq("restaurant_id", rid!)
        .eq("status", "completed")
        .gte("placed_at", startOf(dateStr))
        .lte("placed_at", endOf(dateStr))
        .order("placed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  // Fetch all invoices for the day
  const invoicesQ = useQuery<InvoiceRow[]>({
    queryKey: ["earnings_invoices", rid, dateStr],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, order_id, invoice_number, payment_status, payment_method, total, issued_at")
        .eq("restaurant_id", rid!)
        .gte("issued_at", startOf(dateStr))
        .lte("issued_at", endOf(dateStr));
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });

  const orders  = ordersQ.data  ?? [];
  const invoices = invoicesQ.data ?? [];

  // Build a map of order_id → invoice
  const invoiceMap = new Map<string, InvoiceRow>();
  for (const inv of invoices) invoiceMap.set(inv.order_id, inv);

  // Revenue = sum of ALL completed order totals
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders  = orders.length;
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const billedCount  = orders.filter((o) => invoiceMap.has(o.id)).length;

  // Payment breakdown from invoices
  const byMethod: Record<string, number> = {};
  for (const inv of invoices) {
    const m = inv.payment_method ?? "unpaid";
    byMethod[m] = (byMethod[m] ?? 0) + Number(inv.total);
  }

  async function generateBill(order: OrderRow) {
    if (!restaurant) return;
    setGeneratingId(order.id);
    try {
      // Check not already created
      const { data: existing } = await supabase
        .from("invoices").select("id").eq("order_id", order.id).maybeSingle();
      if (existing?.id) {
        window.open(`/bills/${existing.id}/print`, "_blank");
        return;
      }
      const { data: last } = await supabase
        .from("invoices").select("invoice_number")
        .eq("restaurant_id", restaurant.id)
        .order("issued_at", { ascending: false }).limit(1).maybeSingle();

      const nextNum = nextInvoiceNumber(restaurant.invoice_prefix, last?.invoice_number);
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          restaurant_id: restaurant.id,
          order_id: order.id,
          invoice_number: nextNum,
          subtotal: order.subtotal,
          tax: order.tax,
          discount: order.discount,
          total: order.total,
        })
        .select().single();
      if (error) throw error;
      toast.success(`Bill ${nextNum} generated`);
      void qc.invalidateQueries({ queryKey: ["earnings_invoices", rid, dateStr] });
      void qc.invalidateQueries({ queryKey: ["invoices_today", rid] });
      window.open(`/bills/${data.id}/print`, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGeneratingId(null);
    }
  }

  const isLoading = ordersQ.isLoading || invoicesQ.isLoading;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
        <p className="text-sm text-muted-foreground">Daily revenue from all completed orders</p>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button onClick={prevDay} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-foreground">{formatDisplayDate(dateStr)}</div>
          {isToday && <div className="text-xs text-gold-600 font-medium">Today</div>}
        </div>
        <button onClick={nextDay} disabled={isToday}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
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
              <div className="text-[10px] text-muted-foreground">{billedCount} billed</div>
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

      {/* Orders list */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Completed Orders
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No completed orders on this day.
          </div>
        ) : (
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {orders.map((order) => {
              const inv = invoiceMap.get(order.id);
              return (
                <div key={order.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  {/* Left: order info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">#{order.order_number}</span>
                      {order.table && (
                        <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{order.table.label}</span>
                      )}
                      {order.customer_name && (
                        <span className="text-xs text-muted-foreground truncate">{order.customer_name}</span>
                      )}
                      {inv && (
                        <span className="text-xs text-muted-foreground">{inv.invoice_number}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(order.placed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      <span className="capitalize">{order.source.replace("_", " ")}</span>
                    </div>
                  </div>

                  {/* Right: amount + action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {inv ? (
                      <>
                        <Badge className={
                          inv.payment_status === "paid"    ? "bg-emerald-100 text-emerald-800" :
                          inv.payment_status === "partial" ? "bg-amber-100 text-amber-800" :
                          "bg-zinc-100 text-zinc-700"
                        }>
                          {inv.payment_status}
                        </Badge>
                        {inv.payment_method && (
                          <Badge className={`text-xs capitalize ${methodColor[inv.payment_method] ?? "bg-zinc-100 text-zinc-700"}`}>
                            {inv.payment_method}
                          </Badge>
                        )}
                        <span className="font-bold">{formatINR(order.total)}</span>
                        <Link to={`/bills/${inv.id}/print`} target="_blank"
                          className="text-muted-foreground hover:text-gold-600 transition-colors" title="Print bill">
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="font-bold">{formatINR(order.total)}</span>
                        <button
                          onClick={() => generateBill(order)}
                          disabled={generatingId === order.id}
                          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gold-500/10 text-gold-700 border border-gold-300 hover:bg-gold-500/20 transition-colors disabled:opacity-50"
                        >
                          {generatingId === order.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <FilePlus className="h-3.5 w-3.5" />
                          }
                          Generate Bill
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
