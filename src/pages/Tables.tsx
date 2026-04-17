import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Printer, Trash2, UserCheck } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { randomToken } from "@/lib/utils";
import type { RestaurantTable, Staff } from "@/types/db";

const PUBLIC_BASE = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? window.location.origin;

export default function TablesPage() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const rid = restaurant?.id;

  const tables = useQuery<RestaurantTable[]>({
    queryKey: ["tables", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", rid!)
        .order("label");
      if (error) throw error;
      return (data ?? []) as RestaurantTable[];
    },
  });

  const staffList = useQuery<Staff[]>({
    queryKey: ["staff", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("restaurant_id", rid!);
      if (error) throw error;
      return (data ?? []) as Staff[];
    },
  });

  const [form, setForm] = useState({ label: "", seats: "2" });

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!rid || !form.label.trim()) return;
    const { error } = await supabase.from("restaurant_tables").insert({
      restaurant_id: rid,
      label: form.label.trim(),
      seats: Math.max(1, Number(form.seats) || 2),
      qr_token: randomToken(12),
    });
    if (error) return toast.error(error.message);
    setForm({ label: "", seats: "2" });
    void qc.invalidateQueries({ queryKey: ["tables", rid] });
    toast.success("Table added");
  }

  async function removeTable(id: string) {
    if (!confirm("Remove this table? Existing orders will keep their record.")) return;
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["tables", rid] });
  }

  async function rotateToken(t: RestaurantTable) {
    if (!confirm("Generating a new QR invalidates the old one. Continue?")) return;
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ qr_token: randomToken(12) })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["tables", rid] });
  }

  async function assignWaiter(tableId: string, waiterId: string | null) {
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ assigned_waiter_id: waiterId })
      .eq("id", tableId);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["tables", rid] });
    toast.success(waiterId ? "Waiter assigned" : "Waiter unassigned");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tables & QR codes</h1>
          <p className="text-muted-foreground text-sm">Assign waiters and print QR codes for each table.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
          <Printer className="h-4 w-4" /> Print all
        </Button>
      </div>

      <Card className="no-print max-w-md">
        <CardHeader>
          <CardTitle>Add table</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-[1fr_80px_auto] gap-2 items-end" onSubmit={addTable}>
            <div>
              <Label>Label</Label>
              <Input placeholder="e.g. T1, Garden 3" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div>
              <Label>Seats</Label>
              <Input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {(tables.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground no-print">
          No tables yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print-area">
          {tables.data!.map((t) => {
            const url = `${PUBLIC_BASE}/t/${t.qr_token}`;
            const assignedStaff = staffList.data?.find((s) => s.id === t.assigned_waiter_id);

            return (
              <Card key={t.id} className="break-inside-avoid">
                <CardContent className="p-4 text-center">
                  <div className="mb-1 text-xs text-muted-foreground">Scan to order</div>
                  <div className="font-bold text-lg">{t.label}</div>
                  <div className="text-xs text-muted-foreground mb-3">{t.seats} seats</div>
                  <div className="bg-white rounded-lg p-2 inline-block">
                    <QRCodeSVG value={url} size={140} level="M" includeMargin={false} />
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground break-all">{url}</div>

                  {/* Waiter assignment — hidden in print */}
                  <div className="mt-3 no-print">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                      <UserCheck className="h-3 w-3" />
                      {assignedStaff ? (
                        <span className="text-gold-600 font-medium">{assignedStaff.display_name}</span>
                      ) : (
                        <span className="text-slate-400">No waiter assigned</span>
                      )}
                    </div>
                    {staffList.data && staffList.data.length > 0 && (
                      <select
                        value={t.assigned_waiter_id ?? ""}
                        onChange={(e) => void assignWaiter(t.id, e.target.value || null)}
                        className="w-full text-xs rounded-lg border border-border bg-input text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold-500"
                      >
                        <option value="">— Unassigned —</option>
                        {staffList.data.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.display_name} ({s.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2 justify-center no-print">
                    <Button size="sm" variant="outline" onClick={() => rotateToken(t)}>
                      Rotate QR
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeTable(t.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
