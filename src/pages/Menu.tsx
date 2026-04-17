/**
 * Menu — /menu
 *
 * 3 tabs:
 *  1. Items & Categories — add/edit/toggle menu items
 *  2. Modifiers — create modifier groups (Spice Level, Extras) and link to items
 *  3. Recipe Costing — manage ingredients + link to menu items for food cost %
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Leaf, Beef, ChevronDown, ChevronUp,
  Beaker, FlaskConical, Link2, Percent,
} from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn, formatINR } from "@/lib/utils";
import type { Ingredient, MenuCategory, MenuItem, Modifier, ModifierGroup, RecipeIngredient } from "@/types/db";

type Tab = "items" | "modifiers" | "recipe";

export default function MenuPage() {
  const [tab, setTab] = useState<Tab>("items");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
        <p className="text-muted-foreground text-sm">Manage items, modifiers, and recipe costs.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {([ ["items", "Items & Categories"], ["modifiers", "Modifiers"], ["recipe", "Recipe & Costs"] ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "items"     && <ItemsTab />}
      {tab === "modifiers" && <ModifiersTab />}
      {tab === "recipe"    && <RecipeTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Items & Categories
// ══════════════════════════════════════════════════════════════════════════════

function ItemsTab() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const rid = restaurant?.id;

  const cats = useQuery<MenuCategory[]>({
    queryKey: ["menu_categories", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_categories").select("*").eq("restaurant_id", rid!).order("sort_order");
      if (error) throw error;
      return (data ?? []) as MenuCategory[];
    },
  });

  const items = useQuery<MenuItem[]>({
    queryKey: ["menu_items", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").eq("restaurant_id", rid!).order("name");
      if (error) throw error;
      return (data ?? []) as MenuItem[];
    },
  });

  const [newCat, setNewCat] = useState("");
  async function addCategory() {
    if (!rid || !newCat.trim()) return;
    const { error } = await supabase.from("menu_categories").insert({ restaurant_id: rid, name: newCat.trim(), sort_order: (cats.data?.length ?? 0) + 1 });
    if (error) return toast.error(error.message);
    setNewCat("");
    void qc.invalidateQueries({ queryKey: ["menu_categories", rid] });
  }

  const [form, setForm] = useState({ name: "", price: "", category_id: "", is_veg: true, description: "" });
  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!rid) return;
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price)) return toast.error("Name and valid price required");
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: rid, name: form.name.trim(), price,
      category_id: form.category_id || null, is_veg: form.is_veg,
      description: form.description.trim() || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", price: "", category_id: "", is_veg: true, description: "" });
    void qc.invalidateQueries({ queryKey: ["menu_items", rid] });
    toast.success("Item added");
  }

  async function toggleAvailable(it: MenuItem) {
    const { error } = await supabase.from("menu_items").update({ is_available: !it.is_available }).eq("id", it.id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["menu_items", rid] });
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["menu_items", rid] });
  }

  const grouped = groupByCategory(items.data ?? [], cats.data ?? []);

  return (
    <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
      <Card>
        <CardHeader><CardTitle>Add item</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New category…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <Button onClick={addCategory} variant="outline">Add</Button>
          </div>
          <form className="space-y-3" onSubmit={addItem}>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (₹)</Label><Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— Uncategorized —</option>
                  {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_veg} onChange={(e) => setForm({ ...form, is_veg: e.target.checked })} />Vegetarian</label>
            <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Add item</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {grouped.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No items yet. Add your first dish on the left.</div>
        )}
        {grouped.map((g) => (
          <div key={g.id}>
            <h2 className="font-semibold mb-2">{g.name}</h2>
            <ul className="divide-y rounded-md border bg-card">
              {g.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between p-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {it.is_veg ? <Leaf className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" /> : <Beef className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.name}</div>
                      {it.description && <div className="text-xs text-muted-foreground truncate">{it.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">{formatINR(it.price)}</span>
                    <button onClick={() => toggleAvailable(it)} className={`text-xs px-2 py-1 rounded-full ${it.is_available ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-600"}`}>
                      {it.is_available ? "Available" : "Off"}
                    </button>
                    <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Modifiers
// ══════════════════════════════════════════════════════════════════════════════

function ModifiersTab() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const rid = restaurant?.id;

  const groupsQ = useQuery<(ModifierGroup & { modifiers: Modifier[] })[]>({
    queryKey: ["modifier_groups", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modifier_groups")
        .select("*, modifiers(*)")
        .eq("restaurant_id", rid!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as (ModifierGroup & { modifiers: Modifier[] })[];
    },
  });

  const itemsQ = useQuery<MenuItem[]>({
    queryKey: ["menu_items", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("id,name").eq("restaurant_id", rid!).order("name");
      return (data ?? []) as MenuItem[];
    },
  });

  // New group form
  const [groupForm, setGroupForm] = useState({ name: "", required: false, max_select: "1" });
  const [addingGroup, setAddingGroup] = useState(false);
  async function addGroup() {
    if (!rid || !groupForm.name.trim()) return;
    setAddingGroup(true);
    const { error } = await supabase.from("modifier_groups").insert({
      restaurant_id: rid, name: groupForm.name.trim(),
      required: groupForm.required, max_select: Number(groupForm.max_select) || 1,
      sort_order: (groupsQ.data?.length ?? 0) + 1,
    });
    setAddingGroup(false);
    if (error) return toast.error(error.message);
    setGroupForm({ name: "", required: false, max_select: "1" });
    void qc.invalidateQueries({ queryKey: ["modifier_groups", rid] });
    toast.success("Modifier group created");
  }

  async function deleteGroup(id: string) {
    if (!confirm("Delete this modifier group and all its options?")) return;
    await supabase.from("modifier_groups").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["modifier_groups", rid] });
  }

  return (
    <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
      {/* New group form */}
      <Card>
        <CardHeader><CardTitle>New modifier group</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Group name</Label><Input placeholder="e.g. Spice Level" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} /></div>
          <div><Label>Max selections</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={groupForm.max_select} onChange={(e) => setGroupForm({ ...groupForm, max_select: e.target.value })}>
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={groupForm.required} onChange={(e) => setGroupForm({ ...groupForm, required: e.target.checked })} />
            Required (customer must pick)
          </label>
          <Button onClick={addGroup} disabled={addingGroup} className="w-full"><Plus className="h-4 w-4" /> Create group</Button>
        </CardContent>
      </Card>

      {/* Groups list */}
      <div className="space-y-4">
        {!supabaseConfigured && (
          <div className="rounded-xl bg-gold-500/8 border border-gold-300 px-4 py-3 text-sm text-gold-700">
            Connect Supabase to manage modifiers.
          </div>
        )}
        {groupsQ.data?.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No modifier groups yet.</div>
        )}
        {groupsQ.data?.map((g) => (
          <ModifierGroupCard
            key={g.id} group={g} items={itemsQ.data ?? []}
            rid={rid!}
            onDelete={() => deleteGroup(g.id)}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["modifier_groups", rid] })}
          />
        ))}
      </div>
    </div>
  );
}

function ModifierGroupCard({
  group, items, rid, onDelete, onRefresh,
}: {
  group: ModifierGroup & { modifiers: Modifier[] };
  items: MenuItem[];
  rid: string;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [optForm, setOptForm] = useState({ name: "", price_delta: "0" });
  const [linkItem, setLinkItem] = useState("");

  async function addOption() {
    if (!optForm.name.trim()) return;
    const { error } = await supabase.from("modifiers").insert({
      group_id: group.id, name: optForm.name.trim(),
      price_delta: Number(optForm.price_delta) || 0,
      sort_order: group.modifiers.length + 1,
    });
    if (error) return toast.error(error.message);
    setOptForm({ name: "", price_delta: "0" });
    onRefresh();
  }

  async function deleteOption(id: string) {
    await supabase.from("modifiers").delete().eq("id", id);
    onRefresh();
  }

  async function linkToItem() {
    if (!linkItem) return;
    const { error } = await supabase.from("menu_item_modifier_groups")
      .upsert({ menu_item_id: linkItem, group_id: group.id });
    if (error) return toast.error(error.message);
    setLinkItem("");
    toast.success("Linked!");
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{group.name}</span>
          <span className="text-xs text-muted-foreground">
            {group.required ? "Required" : "Optional"} · max {group.max_select}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{group.modifiers.length} options</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-muted-foreground hover:text-destructive p-1">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          {/* Options */}
          {group.modifiers.length > 0 && (
            <ul className="divide-y rounded-lg border bg-slate-50">
              {group.modifiers.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{m.name}</span>
                  <div className="flex items-center gap-3">
                    {m.price_delta > 0 && <span className="text-gold-600 font-semibold">+ {formatINR(m.price_delta)}</span>}
                    {m.price_delta === 0 && <span className="text-muted-foreground text-xs">free</span>}
                    <button onClick={() => deleteOption(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {/* Add option */}
          <div className="flex gap-2">
            <Input placeholder="Option name (e.g. Extra Spicy)" value={optForm.name} onChange={(e) => setOptForm({ ...optForm, name: e.target.value })} className="flex-1" />
            <Input type="number" placeholder="+₹" value={optForm.price_delta} onChange={(e) => setOptForm({ ...optForm, price_delta: e.target.value })} className="w-20" />
            <Button size="sm" onClick={addOption}><Plus className="h-4 w-4" /></Button>
          </div>
          {/* Link to menu item */}
          <div className="flex gap-2 pt-1 border-t">
            <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={linkItem} onChange={(e) => setLinkItem(e.target.value)}>
              <option value="">Link to a menu item…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={linkToItem}><Link2 className="h-4 w-4" /> Link</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Recipe & Costs
// ══════════════════════════════════════════════════════════════════════════════

function RecipeTab() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const rid = restaurant?.id;

  const ingredientsQ = useQuery<Ingredient[]>({
    queryKey: ["ingredients", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredients").select("*").eq("restaurant_id", rid!).order("name");
      if (error) throw error;
      return (data ?? []) as Ingredient[];
    },
  });

  const itemsQ = useQuery<MenuItem[]>({
    queryKey: ["menu_items", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", rid!).order("name");
      return (data ?? []) as MenuItem[];
    },
  });

  // Ingredient form
  const [ingForm, setIngForm] = useState({ name: "", unit: "kg", cost_per_unit: "", reorder_level: "" });
  async function addIngredient() {
    if (!rid || !ingForm.name.trim()) return;
    const { error } = await supabase.from("ingredients").insert({
      restaurant_id: rid, name: ingForm.name.trim(), unit: ingForm.unit,
      cost_per_unit: Number(ingForm.cost_per_unit) || 0,
      reorder_level: Number(ingForm.reorder_level) || 0,
    });
    if (error) return toast.error(error.message);
    setIngForm({ name: "", unit: "kg", cost_per_unit: "", reorder_level: "" });
    void qc.invalidateQueries({ queryKey: ["ingredients", rid] });
    toast.success("Ingredient added");
  }

  async function deleteIngredient(id: string) {
    await supabase.from("ingredients").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["ingredients", rid] });
  }

  const lowStock = (ingredientsQ.data ?? []).filter((i) => i.stock_qty <= i.reorder_level && i.reorder_level > 0);

  return (
    <div className="space-y-6">
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          ⚠ Low stock: {lowStock.map((i) => i.name).join(", ")}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
        {/* Add ingredient */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Beaker className="h-4 w-4 text-gold-600" /> Add ingredient</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Name</Label><Input placeholder="e.g. Paneer" value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={ingForm.unit} onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })}>
                  {["kg","g","litre","ml","pcs","dozen","packet"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><Label>Cost per unit (₹)</Label><Input type="number" min={0} placeholder="0" value={ingForm.cost_per_unit} onChange={(e) => setIngForm({ ...ingForm, cost_per_unit: e.target.value })} /></div>
            </div>
            <div><Label>Reorder level (alert below)</Label><Input type="number" min={0} placeholder="0" value={ingForm.reorder_level} onChange={(e) => setIngForm({ ...ingForm, reorder_level: e.target.value })} /></div>
            <Button onClick={addIngredient} className="w-full"><Plus className="h-4 w-4" /> Add ingredient</Button>
          </CardContent>
        </Card>

        {/* Ingredients list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm">Ingredients ({ingredientsQ.data?.length ?? 0})</h2>
          {!supabaseConfigured && (
            <div className="rounded-xl bg-gold-500/8 border border-gold-300 px-4 py-3 text-sm text-gold-700">
              Connect Supabase to manage ingredients.
            </div>
          )}
          {(ingredientsQ.data ?? []).length === 0 && supabaseConfigured && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No ingredients yet.</div>
          )}
          <ul className="divide-y rounded-lg border bg-card">
            {(ingredientsQ.data ?? []).map((ing) => {
              const isLow = ing.reorder_level > 0 && ing.stock_qty <= ing.reorder_level;
              return (
                <li key={ing.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {ing.name}
                      {isLow && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">Low stock</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatINR(ing.cost_per_unit)}/{ing.unit} · stock: {ing.stock_qty} {ing.unit}
                    </div>
                  </div>
                  <button onClick={() => deleteIngredient(ing.id)} className="text-muted-foreground hover:text-destructive ml-2"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Recipe linker — per menu item */}
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-gold-600" /> Recipe Costs
        </h2>
        {(itemsQ.data ?? []).length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Add menu items first.</div>
        )}
        <div className="space-y-3">
          {(itemsQ.data ?? []).map((item) => (
            <RecipeRow
              key={item.id}
              item={item}
              ingredients={ingredientsQ.data ?? []}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["ingredients", rid] })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RecipeRow({ item, ingredients, onRefresh }: { item: MenuItem; ingredients: Ingredient[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [selIng, setSelIng] = useState("");
  const [qty, setQty] = useState("0.1");

  const recipeQ = useQuery<(RecipeIngredient & { ingredient: Ingredient })[]>({
    queryKey: ["recipe", item.id],
    enabled: open && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*, ingredient:ingredients(*)")
        .eq("menu_item_id", item.id);
      if (error) throw error;
      return (data ?? []) as (RecipeIngredient & { ingredient: Ingredient })[];
    },
  });

  const foodCost = (recipeQ.data ?? []).reduce((s, r) => s + r.ingredient.cost_per_unit * r.quantity, 0);
  const margin   = item.price - foodCost;
  const costPct  = item.price > 0 ? (foodCost / item.price) * 100 : 0;

  async function addRecipeIng() {
    if (!selIng) return;
    const { error } = await supabase.from("recipe_ingredients").upsert({
      menu_item_id: item.id, ingredient_id: selIng, quantity: Number(qty) || 0.1,
    });
    if (error) return toast.error(error.message);
    setSelIng(""); setQty("0.1");
    void onRefresh();
    void recipeQ.refetch();
  }

  async function removeRecipeIng(id: string) {
    await supabase.from("recipe_ingredients").delete().eq("id", id);
    void recipeQ.refetch();
  }

  const costColor = costPct > 40 ? "text-red-600" : costPct > 28 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{item.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{formatINR(item.price)}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {recipeQ.data && recipeQ.data.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Percent className="h-3 w-3 text-muted-foreground" />
              <span className={cn("font-semibold", costColor)}>{costPct.toFixed(0)}% food cost</span>
              <span className="text-muted-foreground">· margin {formatINR(margin)}</span>
            </div>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          {recipeQ.data && recipeQ.data.length > 0 && (
            <ul className="divide-y rounded-lg border bg-slate-50 text-sm">
              {recipeQ.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2">
                  <span>{r.ingredient.name} — {r.quantity} {r.ingredient.unit}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{formatINR(r.ingredient.cost_per_unit * r.quantity)}</span>
                    <button onClick={() => removeRecipeIng(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              ))}
              <li className="px-3 py-2 flex justify-between font-semibold border-t bg-white">
                <span>Total food cost</span>
                <span className={costColor}>{formatINR(foodCost)} ({costPct.toFixed(1)}%)</span>
              </li>
            </ul>
          )}
          <div className="flex gap-2">
            <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={selIng} onChange={(e) => setSelIng(e.target.value)}>
              <option value="">Add ingredient…</option>
              {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
            <Input type="number" placeholder="qty" value={qty} onChange={(e) => setQty(e.target.value)} className="w-20" />
            <Button size="sm" onClick={addRecipeIng}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function groupByCategory(items: MenuItem[], cats: MenuCategory[]) {
  const groups = cats.map((c) => ({ id: c.id, name: c.name, items: items.filter((i) => i.category_id === c.id) }));
  const uncat = items.filter((i) => !i.category_id);
  if (uncat.length) groups.push({ id: "uncat", name: "Uncategorized", items: uncat });
  return groups.filter((g) => g.items.length > 0);
}
