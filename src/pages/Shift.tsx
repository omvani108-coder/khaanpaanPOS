/**
 * Shift Manager — /shift
 *
 * Owner/manager can:
 * 1. Open a shift (set opening cash in drawer)
 * 2. View live shift summary (orders, cash, card, UPI totals)
 * 3. Close shift with closing cash → auto-generates discrepancy report
 * 4. Browse shift history
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpCircle, Clock, DollarSign,
  IndianRupee, Lock, Unlock, AlertTriangle, TrendingUp,
} from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn, formatINR } from "@/lib/utils";
import type { Shift } from "@/types/db";

// ── demo data ─────────────────────────────────────────────────────────────────
const DEMO_SHIFT: Shift = {
  id: "s1", restaurant_id: "r1",
  opened_by: null, closed_by: null,
  opening_cash: 2000, closing_cash: null,
  notes: null,
  opened_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
  closed_at: null, created_at: new Date().toISOString(),
};

const DEMO_HISTORY: Shift[] = [
  {
    id: "s0", restaurant_id: "r1",
    opened_by: null, closed_by: null,
    opening_cash: 1500, closing_cash: 8450,
    notes: "Busy Saturday night",
    opened_at: new Date(Date.now() - 30 * 3600_000).toISOString(),
    closed_at: new Date(Date.now() - 18 * 3600_000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

const DEMO_SUMMARY = {
  orders: 23, cash: 6450, upi: 12800, card: 4200, total: 23450, discounts: 320,
};

export default function ShiftPage() {
  const { restaurant, user } = useAuth();
  const rid = restaurant?.id;
  const qc = useQueryClient();

  // ── current open shift ──
  const openShiftQ = useQuery<Shift | null>({
    queryKey: ["shift_open", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("restaurant_id", rid!)
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Shift | null;
    },
  });

  // ── shift history ──
  const historyQ = useQuery<Shift[]>({
    queryKey: ["shift_history", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("restaurant_id", rid!)
        .not("closed_at", "is", null)
        .order("opened_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Shift[];
    },
  });

  // ── shift order summary ──
  const openShift = supabaseConfigured ? openShiftQ.data : DEMO_SHIFT;
  const summaryQ = useQuery({
    queryKey: ["shift_summary", openShift?.id],
    enabled: Boolean(openShift?.id) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total, discount, payment_method:invoices(payment_method)")
        .eq("restaurant_id", rid!)
        .gte("placed_at", openShift!.opened_at)
        .in("status", ["completed", "served"]);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ total: number; discount: number; payment_method: Array<{ payment_method: string | null }> }>;
      let cash = 0, upi = 0, card = 0, total = 0, discounts = 0;
      for (const r of rows) {
        total += r.total;
        discounts += r.discount;
        const pm = r.payment_method?.[0]?.payment_method;
        if (pm === "cash") cash += r.total;
        else if (pm === "upi") upi += r.total;
        else if (pm === "card") card += r.total;
      }
      return { orders: rows.length, cash, upi, card, total, discounts };
    },
  });

  const summary = supabaseConfigured ? summaryQ.data : DEMO_SUMMARY;
  const history = supabaseConfigured ? (historyQ.data ?? []) : DEMO_HISTORY;

  // ── open shift ──
  const [openCash, setOpenCash] = useState("2000");
  const [openNotes, setOpenNotes] = useState("");
  const [opening, setOpening] = useState(false);

  async function openShiftFn() {
    if (!rid || !user) return;
    setOpening(true);
    try {
      const { error } = await supabase.from("shifts").insert({
        restaurant_id: rid,
        opened_by: user.id,
        opening_cash: Number(openCash) || 0,
        notes: openNotes.trim() || null,
      });
      if (error) throw error;
      toast.success("Shift opened!");
      void qc.invalidateQueries({ queryKey: ["shift_open", rid] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setOpening(false); }
  }

  // ── close shift ──
  const [closeCash, setCloseCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closing, setClosing] = useState(false);

  async function closeShiftFn() {
    if (!openShift || !user) return;
    setClosing(true);
    try {
      const { error } = await supabase.from("shifts").update({
        closed_by: user.id,
        closing_cash: Number(closeCash) || 0,
        notes: closeNotes.trim() || openShift.notes,
        closed_at: new Date().toISOString(),
      }).eq("id", openShift.id);
      if (error) throw error;
      toast.success("Shift closed successfully");
      void qc.invalidateQueries({ queryKey: ["shift_open", rid] });
      void qc.invalidateQueries({ queryKey: ["shift_history", rid] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setClosing(false); }
  }

  const expectedCash = (openShift?.opening_cash ?? 0) + (summary?.cash ?? 0);
  const actualCash   = Number(closeCash) || 0;
  const discrepancy  = actualCash - expectedCash;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <IndianRupee className="h-6 w-6 text-gold-600" />
          Shift Manager
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Open and close cash shifts. Reconcile the drawer at end of day.
        </p>
      </div>

      {/* No open shift */}
      {!openShift && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-gold-600" /> Open New Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Opening cash in drawer (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={openCash}
                  onChange={(e) => setOpenCash(e.target.value)}
                  placeholder="2000"
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={openNotes} onChange={(e) => setOpenNotes(e.target.value)} placeholder="e.g. Weekend shift" />
              </div>
            </div>
            <Button onClick={openShiftFn} disabled={opening} size="lg">
              <Unlock className="h-5 w-5" />
              Open Shift
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active shift */}
      {openShift && (
        <>
          {/* Shift status bar */}
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-emerald-800 text-sm">Shift active</span>
              <span className="text-emerald-600 text-xs ml-2">
                opened {formatShiftTime(openShift.opened_at)} · opening cash {formatINR(openShift.opening_cash)}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <Clock className="inline h-3 w-3 mr-1" />
              {formatDuration(openShift.opened_at)}
            </span>
          </div>

          {/* Live summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Orders" value={summary?.orders ?? "—"} icon={<TrendingUp className="h-5 w-5 text-blue-600" />} bg="bg-blue-50" />
            <SummaryCard label="Cash" value={summary ? formatINR(summary.cash) : "—"} icon={<IndianRupee className="h-5 w-5 text-emerald-600" />} bg="bg-emerald-50" />
            <SummaryCard label="UPI" value={summary ? formatINR(summary.upi) : "—"} icon={<ArrowUpCircle className="h-5 w-5 text-violet-600" />} bg="bg-violet-50" />
            <SummaryCard label="Card" value={summary ? formatINR(summary.card) : "—"} icon={<DollarSign className="h-5 w-5 text-sky-600" />} bg="bg-sky-50" />
          </div>

          <div className="rounded-2xl bg-gold-500/8 border border-gold-300 px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gold-600 font-semibold uppercase tracking-widest">Total collected</div>
              <div className="text-3xl font-black text-foreground mt-0.5">{summary ? formatINR(summary.total) : "—"}</div>
            </div>
            {summary && summary.discounts > 0 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Discounts given</div>
                <div className="text-lg font-bold text-rose-600">- {formatINR(summary.discounts)}</div>
              </div>
            )}
          </div>

          {/* Close shift */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-rose-500" /> Close Shift
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Actual cash in drawer (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={closeCash}
                    onChange={(e) => setCloseCash(e.target.value)}
                    placeholder={String(expectedCash)}
                  />
                  {closeCash && (
                    <p className={cn("text-xs mt-1 font-medium", discrepancy === 0 ? "text-emerald-600" : discrepancy > 0 ? "text-blue-600" : "text-rose-600")}>
                      {discrepancy === 0
                        ? "✓ Cash matches perfectly"
                        : discrepancy > 0
                          ? `↑ Over by ${formatINR(discrepancy)}`
                          : `↓ Short by ${formatINR(Math.abs(discrepancy))}`}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Closing notes</Label>
                  <Input value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Any remarks…" />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opening cash</span>
                  <span className="font-medium">{formatINR(openShift.opening_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash sales</span>
                  <span className="font-medium">+ {formatINR(summary?.cash ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-muted-foreground">Expected in drawer</span>
                  <span className="font-bold">{formatINR(expectedCash)}</span>
                </div>
              </div>

              {closeCash && discrepancy !== 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Cash discrepancy of {formatINR(Math.abs(discrepancy))} will be recorded. Investigate before closing if needed.
                </div>
              )}

              <Button onClick={closeShiftFn} disabled={closing || !closeCash} variant="secondary" size="lg">
                <Lock className="h-5 w-5" />
                Close Shift
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Shift History</h2>
          <div className="space-y-3">
            {history.map((s) => (
                <div key={s.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{formatShiftDate(s.opened_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatShiftTime(s.opened_at)} → {s.closed_at ? formatShiftTime(s.closed_at) : "open"}
                        · {formatDuration(s.opened_at, s.closed_at ?? undefined)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Opening → Closing cash</div>
                      <div className="font-bold">
                        {formatINR(s.opening_cash)} → {s.closing_cash != null ? formatINR(s.closing_cash) : "—"}
                      </div>
                    </div>
                  </div>
                  {s.notes && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{s.notes}</p>}
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon, bg }: { label: string; value: string | number; icon: React.ReactNode; bg: string }) {
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

function formatShiftTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function formatShiftDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
}
function formatDuration(start: string, end?: string) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
