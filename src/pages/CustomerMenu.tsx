import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart, CheckCircle2, Leaf, Beef } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatINR } from "@/lib/utils";
import type { MenuCategory, MenuItem, RestaurantTable } from "@/types/db";

interface Ctx {
  table: RestaurantTable & { restaurant_name: string };
  categories: MenuCategory[];
  items: MenuItem[];
}

export default function CustomerMenuPage() {
  const { token } = useParams<{ token: string }>();

  const ctx = useQuery<Ctx>({
    queryKey: ["customer_menu", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const { data: table, error: tErr } = await supabase
        .from("restaurant_tables")
        .select("*, restaurants(name)")
        .eq("qr_token", token!)
        .eq("is_active", true)
        .maybeSingle();
      if (tErr || !table) throw new Error(tErr?.message ?? "Table not found");

      const rid = (table as RestaurantTable).restaurant_id;
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from("menu_categories").select("*").eq("restaurant_id", rid).order("sort_order"),
        supabase.from("menu_items").select("*").eq("restaurant_id", rid).eq("is_available", true).order("name"),
      ]);

      const joined = table as RestaurantTable & { restaurants?: { name: string } | null };
      return {
        table: { ...(table as RestaurantTable), restaurant_name: joined.restaurants?.name ?? "Restaurant" },
        categories: (cats ?? []) as MenuCategory[],
        items: (items ?? []) as MenuItem[],
      };
    },
  });

  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ orderNumber?: number; id: string } | null>(null);

  const items = ctx.data?.items ?? [];
  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  function inc(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function dec(id: string) {
    setCart((c) => {
      const q = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }

  const subtotal = Object.entries(cart).reduce(
    (s, [id, q]) => s + (byId[id]?.price ?? 0) * q,
    0
  );
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  async function place() {
    if (!token || cartCount === 0) return;
    setPlacing(true);
    try {
      const payload = Object.entries(cart).map(([menu_item_id, quantity]) => ({
        menu_item_id,
        quantity,
      }));
      const { data, error } = await supabase.rpc("place_customer_order", {
        p_token: token,
        p_items: payload,
        p_customer_name: name.trim() || null,
        p_customer_phone: phone.trim() || null,
      });
      if (error) throw error;
      setPlaced({ id: data as string });
      setCart({});
      toast.success("Order placed!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  useEffect(() => {
    document.body.classList.add("pb-24");
    return () => document.body.classList.remove("pb-24");
  }, []);

  if (ctx.isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading menu…</div>;
  }
  if (ctx.error || !ctx.data) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-bold mb-2">Table not found</h1>
        <p className="text-muted-foreground text-sm">This QR code may have been rotated. Please ask staff for an updated one.</p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div>
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Order placed!</h1>
          <p className="text-muted-foreground mt-2">The kitchen has been notified. You can keep this tab open to watch status, or close it.</p>
          <Button className="mt-6" onClick={() => setPlaced(null)}>
            Order more
          </Button>
        </div>
      </div>
    );
  }

  const grouped = groupByCategory(ctx.data.items, ctx.data.categories);

  return (
    <div className="min-h-screen bg-background">
      <header
        className="relative overflow-hidden px-4 py-5"
        style={{
          background: "linear-gradient(160deg, hsl(0 65% 22%) 0%, hsl(0 60% 18%) 100%)",
          borderBottom: "2px solid hsl(43 74% 42%)",
        }}
      >
        {/* Ivory chain top strip */}
        <div className="absolute top-0 left-0 right-0 h-[10px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23F5E6C8' opacity='0.5'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23F5E6C8' stroke-width='0.8' stroke-dasharray='2%2C1' opacity='0.5'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23F5E6C8' opacity='0.5'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.5'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.5'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat-x", backgroundSize: "40px 10px",
          }}
        />
        <div className="mt-2 flex items-center gap-3">
          <span className="text-2xl">🪷</span>
          <div>
            <div className="text-xs uppercase tracking-widest opacity-60" style={{ color: "hsl(38 60% 80%)" }}>
              {ctx.data.table.restaurant_name}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(43 74% 82%)", fontFamily: "Georgia, serif" }}>
              Table {ctx.data.table.label}
            </h1>
            <p className="text-sm opacity-75 mt-0.5" style={{ color: "hsl(38 60% 82%)" }}>
              Tap + to add items, then place your order.
            </p>
          </div>
        </div>
        {/* Gold chain bottom strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[10px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23C9920A' opacity='0.5'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23C9920A' stroke-width='0.8' stroke-dasharray='2%2C1' opacity='0.5'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23C9920A' opacity='0.5'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23C9920A' opacity='0.5'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23C9920A' opacity='0.5'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat-x", backgroundSize: "40px 10px",
          }}
        />
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-6">
        {grouped.map((g) => (
          <section key={g.id}>
            <h2 className="font-semibold mb-2">{g.name}</h2>
            <ul className="space-y-2">
              {g.items.map((it) => {
                const q = cart[it.id] ?? 0;
                return (
                  <li key={it.id} className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
                    <div className="flex items-start gap-2 min-w-0">
                      {it.is_veg ? (
                        <Leaf className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Beef className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium">{it.name}</div>
                        {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
                        <div className="text-sm font-semibold mt-1">{formatINR(it.price)}</div>
                      </div>
                    </div>
                    {q === 0 ? (
                      <Button size="sm" onClick={() => inc(it.id)}>
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => dec(it.id)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold w-6 text-center">{q}</span>
                        <Button size="sm" onClick={() => inc(it.id)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>

      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-card border-t p-3 shadow-lg">
          <div className="max-w-xl mx-auto space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={placing}
              onClick={place}
            >
              <ShoppingCart className="h-5 w-5" />
              Place order • {cartCount} items • {formatINR(subtotal)}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">Tax added on your final bill.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function groupByCategory(items: MenuItem[], cats: MenuCategory[]) {
  const groups = cats.map((c) => ({ id: c.id, name: c.name, items: items.filter((i) => i.category_id === c.id) }));
  const uncat = items.filter((i) => !i.category_id);
  if (uncat.length) groups.push({ id: "uncat", name: "More", items: uncat });
  return groups.filter((g) => g.items.length > 0);
}
