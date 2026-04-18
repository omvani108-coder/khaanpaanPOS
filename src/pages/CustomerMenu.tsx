/**
 * Customer QR Self-Ordering — /t/:token
 *
 * Flow:
 * 1. Customer scans table QR
 * 2. Browses menu with categories
 * 3. Taps "Add" → modifier sheet pops up if item has modifiers
 * 4. Adds to cart with chosen modifiers
 * 5. Places order → goes live in kitchen / KDS instantly
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Minus, Plus, ShoppingCart, CheckCircle2, Leaf, Beef,
  ChefHat, X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatINR } from "@/lib/utils";
import type { MenuCategory, MenuItem, ModifierGroupWithOptions, RestaurantTable } from "@/types/db";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartEntry {
  itemId: string;
  quantity: number;
  /** modifier_id → name_snapshot + price_snapshot */
  modifiers: Record<string, { name: string; price: number }>;
  /** unique key so same item with different modifiers = separate cart entries */
  key: string;
}

interface Ctx {
  table: RestaurantTable & { restaurant_name: string };
  categories: MenuCategory[];
  items: MenuItem[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function modKey(modifiers: Record<string, { name: string; price: number }>) {
  return Object.keys(modifiers).sort().join(",");
}

function cartEntryKey(itemId: string, modifiers: Record<string, { name: string; price: number }>) {
  return `${itemId}__${modKey(modifiers)}`;
}

function entryPrice(item: MenuItem, entry: CartEntry) {
  const modExtra = Object.values(entry.modifiers).reduce((s, m) => s + m.price, 0);
  return (item.price + modExtra) * entry.quantity;
}

// ══════════════════════════════════════════════════════════════════════════════

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

  // Modifier groups for ALL items in this restaurant
  const modifiersQ = useQuery<Record<string, ModifierGroupWithOptions[]>>({
    queryKey: ["customer_menu_modifiers", ctx.data?.table.restaurant_id],
    enabled: Boolean(ctx.data?.table.restaurant_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_item_modifier_groups")
        .select("menu_item_id, group:modifier_groups(*, modifiers(*))")
        .in("menu_item_id", (ctx.data?.items ?? []).map((i) => i.id));
      if (error) throw error;
      const map: Record<string, ModifierGroupWithOptions[]> = {};
      for (const row of data ?? []) {
        const r = row as unknown as { menu_item_id: string; group: ModifierGroupWithOptions };
        if (!map[r.menu_item_id]) map[r.menu_item_id] = [];
        map[r.menu_item_id].push(r.group);
      }
      return map;
    },
  });

  const [cart, setCart] = useState<CartEntry[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: string } | null>(null);

  // Modifier sheet state
  const [modSheet, setModSheet] = useState<{ item: MenuItem; selectedMods: Record<string, { name: string; price: number }> } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const items = ctx.data?.items ?? [];
  const byId  = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const modMap = modifiersQ.data ?? {};

  function openModSheet(item: MenuItem) {
    setModSheet({ item, selectedMods: {} });
  }

  function toggleMod(groupId: string, modifier: { id: string; name: string; price_delta: number }, maxSelect: number) {
    if (!modSheet) return;
    const sel = { ...modSheet.selectedMods };
    if (sel[modifier.id]) {
      delete sel[modifier.id];
    } else {
      // enforce max_select per group
      const groupMods = Object.entries(sel).filter(([mid]) =>
        modSheet.item && (modMap[modSheet.item.id] ?? []).find((g) => g.id === groupId && g.modifiers.some((m) => m.id === mid))
      );
      if (groupMods.length >= maxSelect) {
        // remove oldest in group
        delete sel[groupMods[0][0]];
      }
      sel[modifier.id] = { name: modifier.name, price: modifier.price_delta };
    }
    setModSheet({ ...modSheet, selectedMods: sel });
  }

  function addToCartFromSheet() {
    if (!modSheet) return;
    const { item, selectedMods } = modSheet;
    const key = cartEntryKey(item.id, selectedMods);
    setCart((prev) => {
      const idx = prev.findIndex((e) => e.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { itemId: item.id, quantity: 1, modifiers: selectedMods, key }];
    });
    setModSheet(null);
  }

  function addDirect(itemId: string) {
    const key = cartEntryKey(itemId, {});
    setCart((prev) => {
      const idx = prev.findIndex((e) => e.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { itemId, quantity: 1, modifiers: {}, key }];
    });
  }

  function decEntry(key: string) {
    setCart((prev) => {
      const idx = prev.findIndex((e) => e.key === key);
      if (idx < 0) return prev;
      const next = [...prev];
      if (next[idx].quantity <= 1) { next.splice(idx, 1); return next; }
      next[idx] = { ...next[idx], quantity: next[idx].quantity - 1 };
      return next;
    });
  }

  function incEntry(key: string) {
    setCart((prev) => prev.map((e) => e.key === key ? { ...e, quantity: e.quantity + 1 } : e));
  }

  const cartCount   = cart.reduce((s, e) => s + e.quantity, 0);
  const cartSubtotal = cart.reduce((s, e) => {
    const item = byId[e.itemId];
    return s + (item ? entryPrice(item, e) : 0);
  }, 0);

  // Check if item is in cart (any variant)
  function itemQty(itemId: string) {
    return cart.filter((e) => e.itemId === itemId).reduce((s, e) => s + e.quantity, 0);
  }

  // In-flight guard: prevents re-entry if user rapid-taps before setPlacing
  // registers. Paired with a stable idempotency key so server will dedupe
  // even if the first request succeeded but the response was lost.
  const inFlightRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  async function place() {
    if (!token || cartCount === 0) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Generate once per checkout attempt; keep the same key across retries
    // of the SAME cart so the server returns the existing order instead of
    // creating a duplicate.
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    setPlacing(true);
    try {
      const payload = cart.flatMap((entry) =>
        Array.from({ length: 1 }).map(() => ({
          menu_item_id: entry.itemId,
          quantity: entry.quantity,
          modifiers: Object.entries(entry.modifiers).map(([mid, m]) => ({
            modifier_id: mid,
            name_snapshot: m.name,
            price_snapshot: m.price,
          })),
        }))
      );
      const { data, error } = await supabase.rpc("place_customer_order", {
        p_token: token,
        p_items: payload,
        p_customer_name: name.trim() || null,
        p_customer_phone: phone.trim() || null,
        p_idempotency_key: idempotencyKeyRef.current,
      });
      if (error) throw error;
      setPlaced({ id: data as string });
      setCart([]);
      setCartOpen(false);
      idempotencyKeyRef.current = null; // fresh key for the next order
      toast.success("Order placed!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPlacing(false);
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    document.body.classList.add("pb-28");
    return () => document.body.classList.remove("pb-28");
  }, []);

  // ── render ──────────────────────────────────────────────────────────────────

  if (ctx.isLoading) return <div className="p-10 text-center text-muted-foreground">Loading menu…</div>;
  if (ctx.error || !ctx.data) return (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold mb-2">Table not found</h1>
      <p className="text-muted-foreground text-sm">This QR code may have been rotated. Please ask staff for an updated one.</p>
    </div>
  );

  if (placed) return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div>
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Order placed!</h1>
        <p className="text-muted-foreground mt-2">The kitchen has been notified. Your food is being prepared.</p>
        <Button className="mt-6" onClick={() => setPlaced(null)}>Order more</Button>
      </div>
    </div>
  );

  const grouped = groupByCategory(ctx.data.items, ctx.data.categories);

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500 flex items-center justify-center flex-shrink-0 shadow-gold-glow">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">{ctx.data.table.restaurant_name}</div>
            <h1 className="text-base font-bold text-slate-900 truncate">Table {ctx.data.table.label}</h1>
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => setCartOpen((v) => !v)}
              className="ml-auto flex items-center gap-2 rounded-xl bg-gold-500 text-white px-3 py-1.5 text-sm font-semibold shadow-gold-glow"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount}
            </button>
          )}
        </div>
      </header>

      {/* Category quick-jump */}
      {grouped.length > 1 && (
        <div className="sticky top-[69px] z-10 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-2 overflow-x-auto flex gap-2 max-w-xl mx-auto">
          {grouped.map((g) => (
            <a key={g.id} href={`#cat-${g.id}`} className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-gold-500/10 hover:text-gold-700 transition-colors">
              {g.name}
            </a>
          ))}
        </div>
      )}

      {/* Menu */}
      <main className="max-w-xl mx-auto px-4 py-4 space-y-6">
        {grouped.map((g) => (
          <section key={g.id} id={`cat-${g.id}`}>
            <h2 className="font-bold text-slate-900 mb-3 text-lg">{g.name}</h2>
            <ul className="space-y-2.5">
              {g.items.map((it) => {
                const q   = itemQty(it.id);
                const hasModifiers = (modMap[it.id] ?? []).length > 0;
                return (
                  <li key={it.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm p-3.5">
                    <div className="flex items-start gap-2 min-w-0">
                      {it.is_veg
                        ? <Leaf className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                        : <Beef className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        {it.description && <div className="text-xs text-slate-400 mt-0.5">{it.description}</div>}
                        <div className="text-sm font-bold text-slate-700 mt-1">{formatINR(it.price)}</div>
                        {hasModifiers && <div className="text-[10px] text-gold-600 mt-0.5">Customizable</div>}
                      </div>
                    </div>
                    {q === 0 ? (
                      <Button
                        size="sm"
                        onClick={() => hasModifiers ? openModSheet(it) : addDirect(it.id)}
                      >
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => decEntry(cartEntryKey(it.id, {}))}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-bold w-6 text-center text-slate-900">{q}</span>
                        <Button size="sm" onClick={() => hasModifiers ? openModSheet(it) : incEntry(cartEntryKey(it.id, {}))}>
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

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-0 inset-x-0 p-3 bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          <div className="max-w-xl mx-auto">
            <Button size="lg" className="w-full" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-5 w-5" />
              View cart · {cartCount} items · {formatINR(cartSubtotal)}
            </Button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="bg-white rounded-t-3xl max-h-[85dvh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-lg">Your order</h2>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {cart.map((entry) => {
                const item = byId[entry.itemId];
                if (!item) return null;
                const linePrice = entryPrice(item, entry);
                const modNames  = Object.values(entry.modifiers).map((m) => m.name).join(", ");
                return (
                  <div key={entry.key} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.name}</div>
                      {modNames && <div className="text-xs text-muted-foreground">{modNames}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => decEntry(entry.key)} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-slate-100">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-bold w-5 text-center">{entry.quantity}</span>
                      <button onClick={() => incEntry(entry.key)} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-slate-100">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-semibold w-16 text-right">{formatINR(linePrice)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button size="lg" className="w-full" disabled={placing} onClick={place}>
                <ShoppingCart className="h-5 w-5" />
                Place order · {formatINR(cartSubtotal)}
              </Button>
              <p className="text-[10px] text-center text-slate-400">Tax added on your final bill.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modifier selection sheet */}
      {modSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="bg-white rounded-t-3xl max-h-[80dvh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold">{modSheet.item.name}</h2>
                <p className="text-sm text-muted-foreground">Customize your order</p>
              </div>
              <button onClick={() => setModSheet(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {(modMap[modSheet.item.id] ?? []).map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{group.name}</h3>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", group.required ? "bg-gold-500/10 text-gold-700" : "bg-slate-100 text-slate-500")}>
                      {group.required ? "Required" : "Optional"} · Pick {group.max_select}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.modifiers.filter((m) => m.is_available).map((mod) => {
                      const selected = Boolean(modSheet.selectedMods[mod.id]);
                      return (
                        <button
                          key={mod.id}
                          onClick={() => toggleMod(group.id, { id: mod.id, name: mod.name, price_delta: mod.price_delta }, group.max_select)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-sm",
                            selected
                              ? "border-gold-500 bg-gold-500/8 text-gold-700 font-semibold"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          )}
                        >
                          <span>{mod.name}</span>
                          {mod.price_delta > 0 && <span className="font-semibold">+ {formatINR(mod.price_delta)}</span>}
                          {mod.price_delta === 0 && <span className="text-slate-400 text-xs">free</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-slate-100">
              <Button size="lg" className="w-full" onClick={addToCartFromSheet}>
                <Plus className="h-5 w-5" />
                Add to cart · {formatINR(
                  modSheet.item.price + Object.values(modSheet.selectedMods).reduce((s, m) => s + m.price, 0)
                )}
              </Button>
            </div>
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
