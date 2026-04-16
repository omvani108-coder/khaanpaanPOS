import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { formatINR, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  total: number;
  payment_status: "unpaid" | "paid" | "partial" | "refunded";
  payment_method: string | null;
  issued_at: string;
  orders: { order_number: number; source: string } | null;
}

export default function BillsPage() {
  const { restaurant } = useAuth();
  const rid = restaurant?.id;

  const q = useQuery<InvoiceRow[]>({
    queryKey: ["invoices", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, payment_status, payment_method, issued_at, orders(order_number, source)")
        .eq("restaurant_id", rid!)
        .order("issued_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
      {(q.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No bills generated yet.
        </div>
      ) : (
        <div className="rounded-md border bg-card divide-y">
          {q.data!.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{inv.invoice_number}</div>
                <div className="text-xs text-muted-foreground">
                  Order #{inv.orders?.order_number} • {formatTime(inv.issued_at)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  className={
                    inv.payment_status === "paid"
                      ? "bg-emerald-100 text-emerald-900"
                      : inv.payment_status === "partial"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-zinc-100 text-zinc-800"
                  }
                >
                  {inv.payment_status}
                </Badge>
                <span className="font-bold">{formatINR(inv.total)}</span>
                <Link
                  to={`/bills/${inv.id}/print`}
                  target="_blank"
                  className="text-primary hover:text-primary/80"
                  aria-label="Print"
                >
                  <Printer className="h-5 w-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
