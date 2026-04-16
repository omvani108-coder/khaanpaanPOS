import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Leaf, Beef } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/types/db";

export default function MenuPage() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const rid = restaurant?.id;

  const cats = useQuery<MenuCategory[]>({
    queryKey: ["menu_categories", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", rid!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MenuCategory[];
    },
  });

  const items = useQuery<MenuItem[]>({
    queryKey: ["menu_items", rid],
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

  const [newCat, setNewCat] = useState("");
  async function addCategory() {
    if (!rid || !newCat.trim()) return;
    const { error } = await supabase.from("menu_categories").insert({
      restaurant_id: rid,
      name: newCat.trim(),
      sort_order: (cats.data?.length ?? 0) + 1,
    });
    if (error) return toast.error(error.message);
    setNewCat("");
    void qc.invalidateQueries({ queryKey: ["menu_categories", rid] });
  }

  const [form, setForm] = useState<{ name: string; price: string; category_id: string; is_veg: boolean; description: string }>({
    name: "",
    price: "",
    category_id: "",
    is_veg: true,
    description: "",
  });

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!rid) return;
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price)) {
      return toast.error("Name and valid price required");
    }
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: rid,
      name: form.name.trim(),
      price,
      category_id: form.category_id || null,
      is_veg: form.is_veg,
      description: form.description.trim() || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", price: "", category_id: "", is_veg: true, description: "" });
    void qc.invalidateQueries({ queryKey: ["menu_items", rid] });
    toast.success("Item added");
  }

  async function toggleAvailable(it: MenuItem) {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !it.is_available })
      .eq("id", it.id);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
        <p className="text-muted-foreground text-sm">Categories and items shown to customers scanning QR codes.</p>
      </div>

      <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="New category…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
              <Button onClick={addCategory} variant="outline">Add</Button>
            </div>
            <form className="space-y-3" onSubmit={addItem}>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">— Uncategorized —</option>
                    {cats.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_veg} onChange={(e) => setForm({ ...form, is_veg: e.target.checked })} />
                Vegetarian
              </label>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" /> Add item
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {grouped.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              No items yet. Add your first dish on the left.
            </div>
          )}
          {grouped.map((g) => (
            <div key={g.id}>
              <h2 className="font-semibold mb-2">{g.name}</h2>
              <ul className="divide-y rounded-md border bg-card">
                {g.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between p-3">
                    <div className="flex items-start gap-2 min-w-0">
                      {it.is_veg ? (
                        <Leaf className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Beef className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        {it.description && <div className="text-xs text-muted-foreground truncate">{it.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatINR(it.price)}</span>
                      <button
                        onClick={() => toggleAvailable(it)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          it.is_available ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {it.is_available ? "Available" : "Off"}
                      </button>
                      <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function groupByCategory(items: MenuItem[], cats: MenuCategory[]) {
  const groups = cats.map((c) => ({ id: c.id, name: c.name, items: items.filter((i) => i.category_id === c.id) }));
  const uncat = items.filter((i) => !i.category_id);
  if (uncat.length) groups.push({ id: "uncat", name: "Uncategorized", items: uncat });
  return groups.filter((g) => g.items.length > 0);
}
