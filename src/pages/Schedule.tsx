/**
 * AI Schedule & Analytics — /schedule
 *
 * Shows a weekday×hour heatmap of the last 30 days of orders,
 * plus a BhojanBot-powered staffing recommendation.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Sparkles, RefreshCw } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { HourlyOrderCount, ScheduleInsight } from "@/types/db";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/ai-schedule`;

// ── Demo mock data when Supabase not configured ───────────────────────────────
function mockHeatmap(): HourlyOrderCount[] {
  const data: HourlyOrderCount[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      let count = 0;
      if (hour >= 12 && hour <= 14) count = Math.floor(Math.random() * 15) + 5;
      if (hour >= 19 && hour <= 22) count = Math.floor(Math.random() * 20) + (dow >= 5 ? 15 : 8);
      if (count > 0) data.push({ dow, hour, count });
    }
  }
  return data;
}

const MOCK_INSIGHT: ScheduleInsight = {
  heatmap: mockHeatmap(),
  staffing_rec:
    "• Friday & Saturday 7–10 PM: add 2 extra waiters (peak ~30+ orders/hr)\n• Daily lunch 12–2 PM: ensure at least 3 staff on floor\n• Sunday brunch 11 AM–1 PM: add 1 kitchen staff for prep",
  peak_label: "Friday 8–9 PM",
};

export default function SchedulePage() {
  const { restaurant } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const insightQ = useQuery<ScheduleInsight>({
    queryKey: ["ai-schedule", restaurant?.id, refreshKey],
    enabled: Boolean(restaurant?.id) && supabaseConfigured,
    staleTime: 30 * 60_000, // cache 30 min
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ restaurant_id: restaurant!.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<ScheduleInsight>;
    },
  });

  const insight = insightQ.data ?? (supabaseConfigured ? null : MOCK_INSIGHT);

  // Build lookup map for heatmap cells
  const heatMap = new Map<string, number>();
  let maxCount = 1;
  for (const h of insight?.heatmap ?? []) {
    const k = `${h.dow}_${h.hour}`;
    heatMap.set(k, h.count);
    if (h.count > maxCount) maxCount = h.count;
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-gold-600" />
            AI Schedule & Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Last 30 days of orders — BhojanBot identifies your rush hours.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={insightQ.isFetching}
          className="no-print"
        >
          <RefreshCw className={`h-4 w-4 ${insightQ.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* AI Insight card */}
      {insight && (
        <Card className="border-gold-400/20 bg-gold-400/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400 flex items-center justify-center flex-shrink-0 shadow-gold-glow">
                <Sparkles className="w-4.5 h-4.5 text-[#0A0C10]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gold-600 uppercase tracking-widest mb-1">
                  BhojanBot Recommendation
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Peak time: <span className="text-gold-600 font-medium">{insight.peak_label}</span>
                </div>
                <pre className="text-sm text-foreground/85 whitespace-pre-wrap font-sans leading-relaxed">
                  {insight.staffing_rec}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {insightQ.isLoading && (
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-400/10 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-3 rounded bg-slate-200 w-2/3 animate-pulse" />
              <div className="h-3 rounded bg-slate-200 w-1/2 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      {insight && (
        <div>
          <h2 className="text-base font-semibold mb-3">Orders by Hour — Last 30 Days</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Hour labels */}
              <div className="flex mb-1 pl-10">
                {HOURS.filter((h) => h % 2 === 0).map((h) => (
                  <div
                    key={h}
                    className="text-[9px] text-muted-foreground text-center"
                    style={{ width: `${100 / 12}%` }}
                  >
                    {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {DAYS.map((day, dow) => (
                <div key={dow} className="flex items-center gap-2 mb-1">
                  <div className="text-[11px] text-muted-foreground w-8 text-right flex-shrink-0">
                    {day}
                  </div>
                  <div className="flex flex-1 gap-px">
                    {HOURS.map((hour) => {
                      const count = heatMap.get(`${dow}_${hour}`) ?? 0;
                      const intensity = count / maxCount;
                      return (
                        <div
                          key={hour}
                          title={`${day} ${hour}:00 — ${count} order${count !== 1 ? "s" : ""}`}
                          className="flex-1 h-6 rounded-sm transition-all"
                          style={{
                            background:
                              count === 0
                                ? "rgba(0,0,0,0.05)"
                                : `rgba(196,148,24,${0.15 + intensity * 0.85})`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 pl-10">
                <span className="text-[10px] text-muted-foreground">Low</span>
                <div className="flex gap-px">
                  {[0.05, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                    <div
                      key={v}
                      className="w-5 h-3 rounded-sm"
                      style={{ background: `rgba(196,148,24,${0.15 + v * 0.85})` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">High</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No data state */}
      {!insight && !insightQ.isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <BrainCircuit className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-foreground/60">Not enough data yet</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Start taking orders and come back after a week for AI scheduling insights.
          </p>
        </div>
      )}
    </div>
  );
}
