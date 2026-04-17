/**
 * Customer CRM — /customers
 *
 * - Stats bar: total customers, new this month, repeat rate, avg spend
 * - Search by name or phone
 * - Filter tabs: All / VIP / At Risk (no visit in 30 days) / New (first visit this month)
 * - Customer cards: name, phone, visits, spend, loyalty points, last visit
 * - Click → detail slide-over: full order history + loyalty log + editable notes
 * - Auto-populated from orders (trigger in DB), no manual entry needed
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users, Search, Star, AlertTriangle, TrendingUp,
  Phone, Clock, IndianRupee, Gift, X, ChevronRight,
  ShoppingBag, Pencil, Check,
} from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input";
import { cn, formatINR } from "@/lib/utils";
import type { Customer, LoyaltyRedemption, OrderWithItems } from "@/types/db";

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_CUSTOMERS: Customer[] = [
  { id: "c1", restaurant_id: "r1", name: "Priya Sharma", phone: "9876543210", email: null, notes: "Allergic to peanuts", total_visits: 14, total_spent: 8420, loyalty_points: 842, last_visit_at: new Date(Date.now() - 2 * 86400_000).toISOString(), created_at: new Date(Date.now() - 90 * 86400_000).toISOString(), updated_at: new Date().toISOString() },
  { id: "c2", restaurant_id: "r1", name: "Rahul Mehta", phone: "9123456789", email: "rahul@example.com", notes: null, total_visits: 8, total_spent: 5100, loyalty_points: 510, last_visit_at: new Date(Date.now() - 5 * 86400_000).toISOString(), created_at: new Date(Date.now() - 60 * 86400_000).toISOString(), updated_at: new Date().toISOString() },
  { id: "c3", restaurant_id: "r1", name: "Anita Patel", phone: "9988776655", email: null, notes: "Prefers window seat", total_visits: 22, total_spent: 18650, loyalty_points: 1865, last_visit_at: new Date(Date.now() - 1 * 86400_000).toISOString(), created_at: new Date(Date.now() - 180 * 86400_000).toISOString(), updated_at: new Date().toISOString() },
  { id: "c4", restaurant_id: "r1", name: "Vikram Singh", phone: "9012345678", email: null, notes: null, total_visits: 3, total_spent: 1890, loyalty_points: 189, last_visit_at: new Date(Date.now() - 35 * 86400_000).toISOString(), created_at: new Date(Date.now() - 40 * 86400_000).toISOString(), updated_at: new Date().toISOString() },
  { id: "c5", restaurant_id: "r1", name: "Meera Nair", phone: "8877665544", email: null, notes: null, total_visits: 1, total_spent: 620, loyalty_points: 62, last_visit_at: new Date(Date.now() - 45 * 86400_000).toISOString(), created_at: new Date(Date.now() - 45 * 86400_000).toISOString(), updated_at: new Date().toISOString() },
  { id: "c6", restaurant_id: "r1", name: null, phone: "7766554433", email: null, notes: null, total_visits: 2, total_spent: 940, loyalty_points: 94, last_visit_at: new Date(Date.now() - 10 * 86400_000).toISOString(), created_at: new Date(Date.now() - 20 * 86400_000).toISOString(), updated_at: new Date().toISOString() },
];

type FilterTab = "all" | "vip" | "at_risk" | "new";

// ══════════════════════════════════════════════════════════════════════════════

export default function CustomersPage() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;
  const qc = useQueryClient();

  const customersQ = useQuery<Customer[]>({
    queryKey: ["customers", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", rid!)
        .order("last_visit_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const customers = supabaseConfigured ? (customersQ.data ?? []) : DEMO_CUSTOMERS;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<Customer | null>(null);

  const now = Date.now();
  const thirtyDaysAgo  = now - 30  * 86400_000;
  const startOfMonth   = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);

  // Stats
  const totalCustomers = customers.length;
  const newThisMonth   = customers.filter((c) => new Date(c.created_at) >= startOfMonth).length;
  const repeatCustomers = customers.filter((c) => c.total_visits > 1).length;
  const repeatRate     = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
  const avgSpend       = totalCustomers > 0 ? customers.reduce((s, c) => s + c.total_spent, 0) / totalCustomers : 0;

  // VIP threshold = top 20% by spend
  const spends       = customers.map((c) => c.total_spent).sort((a, b) => b - a);
  const vipThreshold = spends[Math.floor(spends.length * 0.2)] ?? 0;

  const filtered = useMemo(() => {
    let list = customers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.phone.includes(q) || (c.name ?? "").toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case "vip":     return list.filter((c) => c.total_spent >= vipThreshold && vipThreshold > 0);
      case "at_risk": return list.filter((c) => c.last_visit_at && new Date(c.last_visit_at).getTime() < thirtyDaysAgo);
      case "new":     return list.filter((c) => new Date(c.created_at) >= startOfMonth);
      default:        return list;
    }
  }, [customers, search, filter, vipThreshold, thirtyDaysAgo, startOfMonth]);

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-gold-600" />
          Customer CRM
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Auto-built from orders. Every customer who shares their phone is tracked here.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-5 w-5 text-blue-600" />} label="Total customers" value={totalCustomers} bg="bg-blue-50" />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="New this month" value={newThisMonth} bg="bg-emerald-50" />
        <StatCard icon={<Star className="h-5 w-5 text-gold-600" />} label="Repeat rate" value={`${repeatRate}%`} bg="bg-gold-500/10" />
        <StatCard icon={<IndianRupee className="h-5 w-5 text-violet-600" />} label="Avg spend / customer" value={formatINR(avgSpend)} bg="bg-violet-50" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {([
            ["all",      "All",      customers.length],
            ["vip",      "⭐ VIP",    customers.filter((c) => c.total_spent >= vipThreshold && vipThreshold > 0).length],
            ["at_risk",  "⚠ At Risk", customers.filter((c) => c.last_visit_at && new Date(c.last_visit_at).getTime() < thirtyDaysAgo).length],
            ["new",      "🆕 New",    newThisMonth],
          ] as [FilterTab, string, number][]).map(([t, label, count]) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                filter === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label} {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">
            {search ? "No customers match your search" : "No customers yet"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Customers are auto-added when they share their phone number while ordering.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              isVip={c.total_spent >= vipThreshold && vipThreshold > 0}
              isAtRisk={!!c.last_visit_at && new Date(c.last_visit_at).getTime() < thirtyDaysAgo}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {/* Detail slide-over */}
      {selected && (
        <CustomerDetail
          customer={selected}
          rid={rid!}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => {
            setSelected(updated);
            void qc.invalidateQueries({ queryKey: ["customers", rid] });
          }}
        />
      )}
    </div>
  );
}

// ── Customer Card ─────────────────────────────────────────────────────────────

function CustomerCard({
  customer: c, isVip, isAtRisk, onClick,
}: {
  customer: Customer;
  isVip: boolean;
  isAtRisk: boolean;
  onClick: () => void;
}) {
  const daysSince = c.last_visit_at
    ? Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / 86400_000)
    : null;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border bg-card p-4 hover:border-gold-400 hover:shadow-card transition-all group space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate">{c.name ?? "Unknown"}</span>
            {isVip && <Star className="h-3.5 w-3.5 text-gold-500 fill-gold-400 flex-shrink-0" />}
            {isAtRisk && !isVip && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Phone className="h-3 w-3" /> {c.phone}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-gold-500 transition-colors flex-shrink-0 mt-0.5" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-xs text-muted-foreground">Visits</div>
          <div className="font-bold text-sm">{c.total_visits}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-xs text-muted-foreground">Spent</div>
          <div className="font-bold text-sm">{formatINR(c.total_spent)}</div>
        </div>
        <div className="rounded-xl bg-gold-500/8 px-2 py-2">
          <div className="text-xs text-gold-600">Points</div>
          <div className="font-bold text-sm text-gold-700">{c.loyalty_points}</div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {daysSince === null ? "Never visited"
          : daysSince === 0 ? "Visited today"
          : daysSince === 1 ? "Yesterday"
          : `${daysSince} days ago`}
        {isAtRisk && (
          <span className="ml-auto text-amber-600 font-medium">At risk</span>
        )}
      </div>
    </button>
  );
}

// ── Customer Detail Slide-over ────────────────────────────────────────────────

function CustomerDetail({
  customer, rid, onClose, onUpdate,
}: {
  customer: Customer;
  rid: string;
  onClose: () => void;
  onUpdate: (c: Customer) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const ordersQ = useQuery<OrderWithItems[]>({
    queryKey: ["customer_orders", customer.id],
    enabled: supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*), table:restaurant_tables(label)")
        .eq("restaurant_id", rid)
        .eq("customer_phone", customer.phone)
        .order("placed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as OrderWithItems[];
    },
  });

  const loyaltyQ = useQuery<LoyaltyRedemption[]>({
    queryKey: ["customer_loyalty", customer.id],
    enabled: supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_redemptions")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as LoyaltyRedemption[];
    },
  });

  async function saveNotes() {
    setSavingNotes(true);
    const { data, error } = await supabase
      .from("customers")
      .update({ notes: notes.trim() || null })
      .eq("id", customer.id)
      .select()
      .single();
    setSavingNotes(false);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
    setEditingNotes(false);
    onUpdate({ ...customer, notes: notes.trim() || null });
  }

  const daysSince = customer.last_visit_at
    ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86400_000)
    : null;

  const pointsValue = Math.floor(customer.loyalty_points / 100) * 10;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-11 h-11 rounded-2xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-black text-gold-600">
              {(customer.name ?? customer.phone)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate">{customer.name ?? "Unknown customer"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> {customer.phone}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-px bg-border">
            {[
              { label: "Visits",  value: customer.total_visits },
              { label: "Spent",   value: formatINR(customer.total_spent) },
              { label: "Avg/visit", value: formatINR(customer.total_visits > 0 ? customer.total_spent / customer.total_visits : 0) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card px-4 py-3 text-center">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-bold text-sm mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          {/* Loyalty points */}
          <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-gold-500/10 to-gold-400/5 border border-gold-300 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-gold-600" />
                <div>
                  <div className="text-xs text-gold-600 font-semibold uppercase tracking-widest">Loyalty Points</div>
                  <div className="text-2xl font-black text-gold-700">{customer.loyalty_points.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Redeemable value</div>
                <div className="font-bold text-foreground">{formatINR(pointsValue)}</div>
                <div className="text-[10px] text-muted-foreground">100 pts = ₹10 off</div>
              </div>
            </div>
            {loyaltyQ.data && loyaltyQ.data.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gold-200 space-y-1">
                {loyaltyQ.data.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                    {r.points_earned > 0 && <span className="text-emerald-600 font-medium">+{r.points_earned} pts</span>}
                    {r.points_redeemed > 0 && <span className="text-rose-600 font-medium">-{r.points_redeemed} pts</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last visit */}
          {customer.last_visit_at && (
            <div className="mx-4 mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last visit: {new Date(customer.last_visit_at).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
              {daysSince !== null && daysSince > 0 && (
                <span className={cn("ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
                  daysSince > 30 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                )}>
                  {daysSince}d ago
                </span>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mx-4 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Staff Notes</span>
              <button
                onClick={() => setEditingNotes((v) => !v)}
                className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Allergies, preferences, VIP notes…"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-1 text-xs bg-gold-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gold-600"
                  >
                    <Check className="h-3 w-3" /> Save
                  </button>
                  <button
                    onClick={() => { setEditingNotes(false); setNotes(customer.notes ?? ""); }}
                    className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={cn(
                "rounded-xl px-3 py-2.5 text-sm",
                customer.notes ? "bg-amber-50 border border-amber-100 text-amber-900" : "bg-slate-50 text-muted-foreground"
              )}>
                {customer.notes ?? "No notes yet. Tap edit to add allergy info, preferences, etc."}
              </div>
            )}
          </div>

          {/* Order history */}
          <div className="mx-4 mt-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Order History ({ordersQ.data?.length ?? 0})
              </span>
            </div>

            {!supabaseConfigured && (
              <div className="rounded-xl bg-gold-500/8 border border-gold-300 px-4 py-3 text-sm text-gold-700">
                Connect Supabase to see order history.
              </div>
            )}

            {ordersQ.isLoading && (
              <div className="space-y-2">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}

            {(ordersQ.data ?? []).length === 0 && !ordersQ.isLoading && supabaseConfigured && (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
                No orders found for this customer.
              </div>
            )}

            <div className="space-y-2">
              {(ordersQ.data ?? []).map((o) => (
                <div key={o.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm">Order #{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.placed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      {o.table && ` · Table ${(o.table as { label: string }).label}`}
                      {" · "}{o.items.length} item{o.items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatINR(o.total)}</div>
                    <div className={cn("text-[10px] font-medium capitalize",
                      o.status === "completed" ? "text-emerald-600" :
                      o.status === "cancelled" ? "text-rose-500" : "text-amber-600"
                    )}>
                      {o.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div className={cn("rounded-2xl border border-border p-4 flex items-start gap-3", bg)}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        <div className="font-bold text-lg text-foreground">{value}</div>
      </div>
    </div>
  );
}
