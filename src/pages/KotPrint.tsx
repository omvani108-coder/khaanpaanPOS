import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { getPaperSize, paperClass } from "@/lib/printSettings";

interface KotData {
  id: string;
  order_number: number;
  source: string;
  placed_at: string;
  notes: string | null;
  restaurant_tables: { label: string } | null;
  restaurants: { name: string };
  order_items: {
    name_snapshot: string;
    quantity: number;
    notes: string | null;
  }[];
}

export default function KotPrintPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const q = useQuery<KotData>({
    queryKey: ["kot", orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, order_number, source, placed_at, notes,
           restaurant_tables(label),
           restaurants(name),
           order_items(name_snapshot, quantity, notes)`
        )
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data as unknown as KotData;
    },
  });

  useEffect(() => {
    if (q.data) {
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [q.data]);

  if (q.isLoading) return <div className="p-10 text-center">Loading KOT…</div>;
  if (q.error || !q.data) return <div className="p-10 text-center">Order not found.</div>;

  const o = q.data;
  const source = o.source.replace("_", " ").toUpperCase();

  return (
    <div className={`min-h-screen bg-white text-black p-4 print-area ${paperClass(getPaperSize())}`}>
      <div className="max-w-[280px] mx-auto font-mono text-[14px] leading-snug">

        {/* Header */}
        <div className="text-center pb-2 mb-2 border-b-2 border-black">
          <div className="text-xs text-gray-500">{o.restaurants.name}</div>
          <div className="font-black text-2xl tracking-widest">KOT</div>
          <div className="text-xs">Kitchen Order Ticket</div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-y-1 text-xs mb-3">
          <div className="font-bold">Order #</div>
          <div className="text-right font-black text-base">{o.order_number}</div>

          <div className="font-bold">Type</div>
          <div className="text-right">{source}</div>

          {o.restaurant_tables && (
            <>
              <div className="font-bold">Table</div>
              <div className="text-right font-bold text-base">{o.restaurant_tables.label}</div>
            </>
          )}

          <div className="font-bold">Time</div>
          <div className="text-right">{formatTime(o.placed_at)}</div>
        </div>

        {/* Items — large and clear for kitchen */}
        <div className="border-t-2 border-black pt-2 mb-2">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 font-bold text-xs border-b border-black pb-1 mb-1">
            <div>QTY</div>
            <div>ITEM</div>
          </div>
          {o.order_items.map((it, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-x-3 py-1 border-b border-dashed border-gray-300 last:border-0">
              <div className="font-black text-xl w-8 text-center leading-tight">{it.quantity}</div>
              <div>
                <div className="font-bold text-[15px] leading-tight">{it.name_snapshot}</div>
                {it.notes && (
                  <div className="text-xs text-gray-600 mt-0.5">↳ {it.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Order-level notes */}
        {o.notes && (
          <div className="border border-black rounded p-1.5 text-xs mb-2">
            <span className="font-bold">Note: </span>{o.notes}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-500 mt-2">
          Printed {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div className="no-print text-center mt-4">
          <Button onClick={() => window.print()}>Print KOT</Button>
        </div>
      </div>
    </div>
  );
}
