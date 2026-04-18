import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR } from "@/lib/utils";
import { computeTax } from "@/lib/gst";
import type { MenuItem, OrderSource } from "@/types/db";

type CartLine = { menu_item_id: string; quantity: number };

export default function DeliveryPage() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const rid = restaurant?.id;

  const items = useQuery<MenuItem[]>({
    queryKey: ["menu_items_all", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", rid!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as MenuItem[];
    },
  });

  const [source, setSource] = useState<OrderSource>("zomato");
  const [ref, setRef] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => Object.fromEntries((items.data ?? []).map((i) => [i.id, i])), [items.data]);
  const subtotal = cart.reduce((s, l) => s + (byId[l.menu_item_id]?.price ?? 0) * l.quantity, 0);
  const tax = computeTax(subtotal, Number(restaurant?.tax_percent ?? 5));
  const total = Math.round((subtotal + tax) * 100) / 100;

  function addLine(menuId: string) {
    setCart((c) => {
      const existing = c.find((x) => x.menu_item_id === menuId);
      if (existing) return c.map((x) => (x.menu_item_id === menuId ? { ...x, quantity: x.quantity + 1 } : x));
      return [...c, { menu_item_id: menuId, quantity: 1 }];
    });
  }
  function setQty(menuId: string, qty: number) {
    if (qty <= 0) return setCart((c) => c.filter((x) => x.menu_item_id !== menuId));
    setCart((c) => c.map((x) => (x.menu_item_id === menuId ? { ...x, quantity: qty } : x)));
  }
  function removeLine(menuId: string) {
    setCart((c) => c.filter((x) => x.menu_item_id !== menuId));
  }

  async function create() {
    if (!rid || cart.length === 0) return;
    setBusy(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          restaurant_id: rid,
          source,
          aggregator_ref: ref.trim() || null,
          customer_name: custName.trim() || null,
          customer_phone: custPhone.trim() || null,
          status: "preparing", // aggregator orders typically start preparing immediately
          subtotal,
          tax,
          total,
        })
        .select()
        .single();
      if (error) throw error;

      const lines = cart.map((l) => ({
        order_id: order.id,
        menu_item_id: l.menu_item_id,
        name_snapshot: byId[l.menu_item_id].name,
        price_snapshot: byId[l.menu_item_id].price,
        quantity: l.quantity,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(lines);
      if (iErr) throw iErr;

      toast.success(`${prettySource(source)} order #${order.order_number} created`);
      setCart([]);
      setRef("");
      setCustName("");
      setCustPhone("");
      void qc.invalidateQueries({ queryKey: ["orders", rid] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery orders</h1>
        <p className="text-muted-foreground text-sm">Enter orders received via Zomato, Swiggy, or phone to track them alongside dine-in.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Platform</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value as OrderSource)}
              >
                <option value="zomato">Zomato</option>
                <option value="swiggy">Swiggy</option>
                <option value="phone">Phone</option>
                <option value="takeaway">Takeaway (counter)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Platform reference / Order ID</Label>
              <Input placeholder="e.g. ZOM-4832109" value={ref} onChange={(e) => setRef(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer name</Label>
                <Input value={custName} onChange={(e) => setCustName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="text-sm font-medium mb-2">Items</div>
              {cart.length === 0 ? (
                <p className="text-xs text-muted-foreground">Pick from the menu on the right to add items.</p>
              ) : (
                <ul className="space-y-2">
                  {cart.map((l) => {
                    const m = byId[l.menu_item_id];
                    if (!m) return null;
                    return (
                      <li key={l.menu_item_id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{m.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-16"
                            value={l.quantity}
                            onChange={(e) => setQty(l.menu_item_id, Number(e.target.value))}
                          />
                          <span className="w-20 text-right">{formatINR(m.price * l.quantity)}</span>
                          <button onClick={() => removeLine(l.menu_item_id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <Row label="Subtotal" value={formatINR(subtotal)} />
              <Row label={`Tax (${restaurant?.tax_percent ?? 5}%)`} value={formatINR(tax)} />
              <Row label="Total" value={formatINR(total)} strong />
            </div>

            <Button className="w-full" size="lg" disabled={busy || cart.length === 0} onClick={create}>
              <Plus className="h-5 w-5" /> Create {prettySource(source)} order
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-semibold mb-3">Menu</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(items.data ?? []).map((it) => (
              <button
                key={it.id}
                onClick={() => addLine(it.id)}
                className="rounded-md border bg-card p-2 text-left hover:bg-accent transition"
              >
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">{formatINR(it.price)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-bold text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function prettySource(s: OrderSource): string {
  switch (s) {
    case "zomato":
      return "Zomato";
    case "swiggy":
      return "Swiggy";
    case "phone":
      return "Phone";
    case "takeaway":
      return "Takeaway";
    default:
      return "Manual";
  }
}
