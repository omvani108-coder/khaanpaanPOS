import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { formatINR, formatTime } from "@/lib/utils";
import { computeGST } from "@/lib/gst";
import { Button } from "@/components/ui/Button";
import { getPaperSize, setPaperSize, paperClass, type PaperSize } from "@/lib/printSettings";
import { useState } from "react";

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
    order_items: {
      name_snapshot: string;
      price_snapshot: number;
      quantity: number;
      is_veg?: boolean;
    }[];
  };
}

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<PaperSize>(getPaperSize());
  function onPaperChange(p: PaperSize) { setPaper(p); setPaperSize(p); }

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
      const t = setTimeout(() => window.print(), 250);
      return () => clearTimeout(t);
    }
  }, [q.data]);

  if (q.isLoading) return <div className="p-10 text-center">Loading…</div>;
  if (q.error || !q.data) return <div className="p-10 text-center">Invoice not found.</div>;

  const inv = q.data;
  const r = inv.restaurants;
  const o = inv.orders;

  // Determine if delivery = IGST; dine-in = CGST + SGST
  const isIgst = ["zomato", "swiggy"].includes(o.source);
  const gst = computeGST(inv.subtotal, r.tax_percent, isIgst);

  const isGstRegistered = Boolean(r.gstin?.trim());

  return (
    <div className={`min-h-screen bg-white text-black p-6 print-area ${paperClass(paper)}`}>
      <div className="max-w-sm mx-auto font-mono text-[12px]">

        {/* Restaurant header */}
        <div className="text-center pb-3 mb-2 border-b border-dashed border-black">
          <div className="font-black text-base uppercase tracking-wide">{r.name}</div>
          {r.address && <div className="text-[11px] mt-0.5">{r.address}</div>}
          {r.phone && <div className="text-[11px]">Ph: {r.phone}</div>}
          {r.gstin && (
            <div className="text-[11px] font-bold mt-1">GSTIN: {r.gstin}</div>
          )}
          {isGstRegistered && (
            <div className="text-[10px] uppercase tracking-widest mt-1 font-semibold">
              {isIgst ? "Tax Invoice (IGST)" : "Tax Invoice"}
            </div>
          )}
        </div>

        {/* Invoice meta */}
        <div className="py-2 text-[11px] grid grid-cols-2 gap-y-0.5">
          <div>Invoice No.</div>
          <div className="text-right font-bold">{inv.invoice_number}</div>

          <div>Order No.</div>
          <div className="text-right">#{o.order_number}</div>

          <div>Type</div>
          <div className="text-right capitalize">{o.source.replace("_", "-")}</div>

          {o.restaurant_tables && (
            <>
              <div>Table</div>
              <div className="text-right">{o.restaurant_tables.label}</div>
            </>
          )}

          <div>Ordered at</div>
          <div className="text-right">{formatTime(o.placed_at)}</div>

          <div>Issued at</div>
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

        {/* Items */}
        <div className="border-t border-dashed border-black pt-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[10px] font-bold border-b border-black pb-1">
            <div>Item</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Amt</div>
          </div>
          {o.order_items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[11px] py-0.5 border-b border-dotted border-gray-200 last:border-0">
              <div className="truncate">{it.name_snapshot}</div>
              <div className="text-right">{formatINR(it.price_snapshot)}</div>
              <div className="text-right">{it.quantity}</div>
              <div className="text-right">{formatINR(it.price_snapshot * it.quantity)}</div>
            </div>
          ))}
        </div>

        {/* Totals + GST breakdown */}
        <div className="border-t border-dashed border-black mt-2 pt-2 text-[11px] space-y-0.5">
          <Row label="Subtotal" value={formatINR(gst.subtotal)} />

          {inv.discount > 0 && (
            <Row label="Discount" value={`− ${formatINR(inv.discount)}`} />
          )}

          {/* GST breakdown — show CGST+SGST or IGST depending on supply type */}
          {isGstRegistered && (
            <>
              {isIgst ? (
                <Row label={`IGST @ ${r.tax_percent}%`} value={formatINR(gst.igst)} />
              ) : (
                <>
                  <Row label={`CGST @ ${r.tax_percent / 2}%`} value={formatINR(gst.cgst)} />
                  <Row label={`SGST @ ${r.tax_percent / 2}%`} value={formatINR(gst.sgst)} />
                </>
              )}
            </>
          )}

          {/* Non-GST registered: just show tax */}
          {!isGstRegistered && (
            <Row label={`Tax @ ${r.tax_percent}%`} value={formatINR(gst.totalTax)} />
          )}

          <div className="border-t-2 border-black mt-1 pt-1 flex justify-between font-black text-sm">
            <span>TOTAL</span>
            <span>{formatINR(inv.total)}</span>
          </div>

          {inv.payment_method && (
            <Row
              label="Payment"
              value={inv.payment_method.toUpperCase()}
            />
          )}
        </div>

        {/* GST amounts in words note (required on tax invoice) */}
        {isGstRegistered && (
          <div className="mt-2 pt-2 border-t border-dashed border-black text-[10px] text-gray-600 space-y-0.5">
            {!isIgst && (
              <>
                <div>CGST: {formatINR(gst.cgst)} | SGST: {formatINR(gst.sgst)}</div>
              </>
            )}
            {isIgst && (
              <div>IGST: {formatINR(gst.igst)}</div>
            )}
            <div>Total tax: {formatINR(gst.totalTax)}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] mt-4 pb-6 space-y-0.5">
          <div>Thank you, visit again!</div>
          {isGstRegistered && (
            <div className="text-gray-500">*This is a computer-generated invoice.</div>
          )}
        </div>

        <div className="no-print mt-6 space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-muted-foreground">Paper size:</span>
            <button
              onClick={() => onPaperChange("80mm")}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
                paper === "80mm" ? "bg-gold-500 text-white border-gold-500" : "border-border bg-muted/40"
              }`}
            >
              80 mm
            </button>
            <button
              onClick={() => onPaperChange("58mm")}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
                paper === "58mm" ? "bg-gold-500 text-white border-gold-500" : "border-border bg-muted/40"
              }`}
            >
              58 mm
            </button>
          </div>
          <div className="space-x-3">
            <Button onClick={() => window.print()}>Print</Button>
            <Button variant="outline" onClick={() => window.close()}>Close</Button>
          </div>
          <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
            Tip: in your browser's print dialog, select your thermal printer,
            set margins to <b>None</b>, and disable headers/footers for a clean receipt.
          </p>
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
