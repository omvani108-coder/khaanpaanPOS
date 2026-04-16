import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { formatINR, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface InvoiceDetails {
  id: string;
  invoice_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_status: string;
  payment_method: string | null;
  issued_at: string;
  restaurants: {
    name: string;
    address: string | null;
    phone: string | null;
    gstin: string | null;
    tax_percent: number;
  };
  orders: {
    order_number: number;
    source: string;
    customer_name: string | null;
    customer_phone: string | null;
    placed_at: string;
    restaurant_tables: { label: string } | null;
    order_items: { name_snapshot: string; price_snapshot: number; quantity: number }[];
  };
}

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();

  const q = useQuery<InvoiceDetails>({
    queryKey: ["invoice_print", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `id, invoice_number, subtotal, tax, discount, total, payment_status, payment_method, issued_at,
           restaurants(name, address, phone, gstin, tax_percent),
           orders(order_number, source, customer_name, customer_phone, placed_at,
                  restaurant_tables(label),
                  order_items(name_snapshot, price_snapshot, quantity))`
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as InvoiceDetails;
    },
  });

  useEffect(() => {
    if (q.data) {
      // Give the browser a tick to render before auto-print
      const t = setTimeout(() => window.print(), 250);
      return () => clearTimeout(t);
    }
  }, [q.data]);

  if (q.isLoading) return <div className="p-10 text-center">Loading…</div>;
  if (q.error || !q.data) return <div className="p-10 text-center">Invoice not found.</div>;

  const inv = q.data;
  const r = inv.restaurants;
  const o = inv.orders;

  return (
    <div className="min-h-screen bg-white text-black p-6 print-area">
      <div className="max-w-sm mx-auto font-mono text-[13px]">
        <div className="text-center border-b border-dashed border-black pb-3">
          <div className="font-bold text-lg">{r.name}</div>
          {r.address && <div className="text-xs">{r.address}</div>}
          {r.phone && <div className="text-xs">Ph: {r.phone}</div>}
          {r.gstin && <div className="text-xs">GSTIN: {r.gstin}</div>}
        </div>

        <div className="py-3 text-xs grid grid-cols-2 gap-y-1">
          <div>Invoice</div>
          <div className="text-right font-bold">{inv.invoice_number}</div>
          <div>Order</div>
          <div className="text-right">#{o.order_number}</div>
          <div>Source</div>
          <div className="text-right uppercase">{o.source.replace("_", " ")}</div>
          {o.restaurant_tables && (
            <>
              <div>Table</div>
              <div className="text-right">{o.restaurant_tables.label}</div>
            </>
          )}
          <div>Placed</div>
          <div className="text-right">{formatTime(o.placed_at)}</div>
          <div>Issued</div>
          <div className="text-right">{formatTime(inv.issued_at)}</div>
          {o.customer_name && (
            <>
              <div>Customer</div>
              <div className="text-right">{o.customer_name}</div>
            </>
          )}
          {o.customer_phone && (
            <>
              <div>Phone</div>
              <div className="text-right">{o.customer_phone}</div>
            </>
          )}
        </div>

        <div className="border-t border-dashed border-black pt-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs font-bold border-b border-black pb-1">
            <div>Item</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Amount</div>
          </div>
          {o.order_items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs py-0.5">
              <div className="truncate">{it.name_snapshot}</div>
              <div className="text-right">{it.quantity}</div>
              <div className="text-right">{formatINR(it.price_snapshot * it.quantity)}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black mt-2 pt-2 text-xs space-y-0.5">
          <Row label="Subtotal" value={formatINR(inv.subtotal)} />
          {inv.discount > 0 && <Row label="Discount" value={`-${formatINR(inv.discount)}`} />}
          <Row label={`Tax (${r.tax_percent}%)`} value={formatINR(inv.tax)} />
          <div className="border-t border-black mt-1 pt-1 flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>{formatINR(inv.total)}</span>
          </div>
        </div>

        <div className="text-center text-xs mt-4 pb-6">
          Thank you, visit again!
        </div>

        <div className="no-print text-center">
          <Button onClick={() => window.print()} variant="primary">
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
