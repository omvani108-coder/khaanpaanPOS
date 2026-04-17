import { Link } from "react-router-dom";
import { ClipboardList, Clock, CheckCircle2, IndianRupee, AlertTriangle, Sparkles, BrainCircuit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { formatINR } from "@/lib/utils";
import { displayStatus } from "@/lib/orderStatus";
import { OrderCard } from "@/components/orders/OrderCard";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import type { ScheduleInsight } from "@/types/db";

const SCHEDULE_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/ai-schedule`;

export default function DashboardPage() {
  const { restaurant } = useAuth();
  const { data: orders = [] } = useOrders(restaurant?.id);

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

  const pending   = orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
  const delayed   = orders.filter((o) => displayStatus(o) === "delayed");
  const completed = orders.filter((o) => o.status === "completed");
  const revenue   = completed.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Today's Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Live overview of kitchen, tables, and revenue.</p>
      </div>

      {/* BhojanBot insight card */}
      {(scheduleQ.data || scheduleQ.isLoading) && (
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
                {scheduleQ.isLoading ? (
                  <div className="h-3 rounded bg-gold-400/15 w-3/4 animate-pulse" />
                ) : (
                  <>
                    <p className="text-sm text-foreground/80">
                      Peak time: <span className="text-gold-600 font-semibold">{scheduleQ.data!.peak_label}</span>
                      {" — "}
                      {scheduleQ.data!.staffing_rec.split("\n")[0].replace(/^[•\-]\s*/, "")}
                    </p>
                    <Link
                      to="/schedule"
                      className="text-xs text-gold-600/70 hover:text-gold-600 mt-1 inline-flex items-center gap-1 transition-colors"
                    >
                      <BrainCircuit className="h-3 w-3" /> Full schedule & analytics →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Active orders"  value={pending.length}       color="blue"   />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Delayed"         value={delayed.length}       color="red"    />
        <StatCard icon={<CheckCircle2  className="h-5 w-5" />} label="Completed"       value={completed.length}     color="emerald"/>
        <StatCard icon={<IndianRupee   className="h-5 w-5" />} label="Revenue"         value={formatINR(revenue)}   color="gold"   />
      </div>

      {/* Active orders */}
      <div>
        <SectionHeading title="Active Orders">
          <Link to="/orders" className="text-sm font-medium text-gold-600 hover:text-gold-500 transition-colors">
            View all →
          </Link>
        </SectionHeading>

        {pending.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-9 w-9 text-slate-300" />}
            title="No active orders"
            description="Orders from QR scans and delivery partners will appear here."
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
            {pending.slice(0, 6).map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const colorMap = {
  blue:   { bg: "bg-blue-50",    icon: "text-blue-600",    ring: "ring-blue-200"    },
  red:    { bg: "bg-red-50",     icon: "text-red-600",     ring: "ring-red-200"     },
  emerald:{ bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-200" },
  gold:   { bg: "bg-gold-500/10",icon: "text-gold-600",    ring: "ring-gold-300"    },
};

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: keyof typeof colorMap;
}) {
  const c = colorMap[color];
  return (
    <Card>
      <CardContent className="p-4 pt-4 flex items-center gap-3">
        <div className={`rounded-xl p-2.5 flex-shrink-0 ring-1 ${c.bg} ${c.icon} ${c.ring}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-bold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
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
