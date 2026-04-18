import { Link } from "react-router-dom";
import { useEffect } from "react";
import type { To } from "react-router-dom";
import { ClipboardList, Clock, CheckCircle2, IndianRupee, AlertTriangle, Sparkles, BrainCircuit } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, updateOrderStatus } from "@/hooks/useOrders";
import { useNewOrders } from "@/contexts/NewOrderContext";
import { formatINR } from "@/lib/utils";
import { displayStatus } from "@/lib/orderStatus";
import { OrderCard } from "@/components/orders/OrderCard";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useLang } from "@/contexts/LangContext";
import t from "@/lib/translations";
import type { OrderWithItems, ScheduleInsight } from "@/types/db";

const SCHEDULE_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/ai-schedule`;

export default function DashboardPage() {
  const { restaurant } = useAuth();
  const { clearNewOrders } = useNewOrders();
  const { l } = useLang();
  const qc = useQueryClient();

  // Fetch today's orders directly — ensures earnings are populated even on
  // a cold load of the dashboard (not relying on another page having run first)
  const { data: ordersData } = useOrders(restaurant?.id);
  const orders: OrderWithItems[] = ordersData ?? [];

  useEffect(() => { clearNewOrders(); }, [clearNewOrders]);

  async function handleAdvance(id: string, to: "preparing" | "ready" | "served" | "completed") {
    try { await updateOrderStatus(id, to); toast.success(`${l(t.dashboard.markedAs)} ${to}`); void qc.invalidateQueries({ queryKey: ["orders", restaurant?.id] }); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function handleCancel(id: string) {
    if (!confirm(l(t.dashboard.cancelOrder))) return;
    try { await updateOrderStatus(id, "cancelled"); toast.success(l(t.dashboard.cancelled)); void qc.invalidateQueries({ queryKey: ["orders", restaurant?.id] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  // BhojanBot daily insight — fetch once per session, 1h cache
  const scheduleQ = useQuery<ScheduleInsight>({
    queryKey: ["ai-schedule", restaurant?.id],
    enabled: Boolean(restaurant?.id) && supabaseConfigured,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(SCHEDULE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ restaurant_id: restaurant!.id }),
      });
      if (!res.ok) throw new Error("schedule fetch failed");
      return res.json();
    },
  });

  // Revenue = sum of all completed orders today (regardless of bill generation)
  const revenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + Number(o.total), 0);

  const pending   = orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
  const delayed   = orders.filter((o) => displayStatus(o) === "delayed");
  const completed = orders.filter((o) => o.status === "completed");

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{l(t.dashboard.title)}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{l(t.dashboard.subtitle)}</p>
      </div>

      {/* BhojanBot insight card — only shows once real data has loaded (no flash) */}
      {scheduleQ.data && (
        <Card className="border-gold-400/20 bg-gold-400/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gold-400 flex items-center justify-center flex-shrink-0 shadow-gold-glow">
                <Sparkles className="w-4 h-4 text-[#0A0C10]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-gold-600 uppercase tracking-widest mb-0.5">
                  BhojanBot
                </div>
                <p className="text-sm text-foreground/80">
                  {l(t.dashboard.peakTime)}: <span className="text-gold-600 font-semibold">{scheduleQ.data.peak_label}</span>
                  {" — "}
                  {scheduleQ.data.staffing_rec.split("\n")[0].replace(/^[•\-]\s*/, "")}
                </p>
                <Link
                  to="/schedule"
                  className="text-xs text-gold-600/70 hover:text-gold-600 mt-1 inline-flex items-center gap-1 transition-colors"
                >
                  <BrainCircuit className="h-3 w-3" /> {l(t.dashboard.fullSchedule)}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label={l(t.dashboard.activeOrders)}   value={pending.length}     color="blue"    to="/orders" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label={l(t.dashboard.delayed)}         value={delayed.length}     color="red"     to="/orders" />
        <StatCard icon={<CheckCircle2  className="h-5 w-5" />} label={l(t.dashboard.completed)}       value={completed.length}   color="emerald" to="/bills"  />
        <StatCard icon={<IndianRupee   className="h-5 w-5" />} label={l(t.dashboard.todaysEarnings)}  value={formatINR(revenue)} color="gold"    to="/earnings" />
      </div>

      {/* Active orders */}
      <div>
        <SectionHeading title={l(t.dashboard.activeOrdersSection)}>
          <Link to="/orders" className="text-sm font-medium text-gold-600 hover:text-gold-500 transition-colors">
            {l(t.dashboard.viewAll)}
          </Link>
        </SectionHeading>

        {pending.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-9 w-9 text-slate-300" />}
            title={l(t.dashboard.noOrders)}
            description={l(t.dashboard.noOrdersDesc)}
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
            {pending.slice(0, 6).map((o) => (
              <OrderCard key={o.id} order={o} onAdvance={handleAdvance} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const colorMap = {
  blue:   { bg: "bg-blue-500/10 dark:bg-blue-500/15",    icon: "text-blue-600 dark:text-blue-400",    accent: "bg-blue-500"    },
  red:    { bg: "bg-red-500/10 dark:bg-red-500/15",      icon: "text-red-600 dark:text-red-400",      accent: "bg-red-500"     },
  emerald:{ bg: "bg-emerald-500/10 dark:bg-emerald-500/15", icon: "text-emerald-600 dark:text-emerald-400", accent: "bg-emerald-500" },
  gold:   { bg: "bg-emerald-500/10 dark:bg-emerald-500/15", icon: "text-emerald-600 dark:text-emerald-400", accent: "bg-emerald-500", value: "text-emerald-600 dark:text-emerald-400" },
};

function StatCard({
  icon, label, value, color, to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: keyof typeof colorMap;
  to?: To;
}) {
  const c = colorMap[color];
  const inner = (
    <CardContent className="p-4 flex flex-col gap-3">
      {/* Icon pill */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.icon}`}>
        {icon}
      </div>
      {/* Label + value stacked */}
      <div>
        <div className="text-[11px] text-muted-foreground font-medium leading-tight mb-0.5">{label}</div>
        <div className={`text-2xl font-bold leading-none ${"value" in c ? c.value : "text-foreground"}`}>{value}</div>
      </div>
    </CardContent>
  );
  return to ? (
    <Link to={to} className="block hover:opacity-80 active:scale-[0.98] transition-all">
      <Card className="overflow-hidden">{inner}</Card>
    </Link>
  ) : (
    <Card className="overflow-hidden">{inner}</Card>
  );
}

export function SectionHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center mt-3">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-medium text-foreground/60">{title}</h3>
      <p className="text-sm text-muted-foreground/60 mt-1">{description}</p>
    </div>
  );
}
