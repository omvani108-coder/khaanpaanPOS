import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SettingsPage() {
  const { restaurant, user, refreshRestaurant } = useAuth();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    address: "",
    phone: "",
    gstin: "",
    tax_percent: "5",
    invoice_prefix: "INV",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name,
        slug: restaurant.slug,
        address: restaurant.address ?? "",
        phone: restaurant.phone ?? "",
        gstin: restaurant.gstin ?? "",
        tax_percent: String(restaurant.tax_percent),
        invoice_prefix: restaurant.invoice_prefix,
      });
    }
  }, [restaurant]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-"),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        gstin: form.gstin.trim() || null,
        tax_percent: Number(form.tax_percent) || 0,
        invoice_prefix: form.invoice_prefix.trim() || "INV",
      };
      if (restaurant) {
        const { error } = await supabase.from("restaurants").update(payload).eq("id", restaurant.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("restaurants")
          .insert({ ...payload, owner_id: user.id })
          .select()
          .single();
        if (error) throw error;
        // Ensure the owner also has a staff row for consistent queries
        await supabase.from("staff").insert({
          restaurant_id: data.id,
          user_id: user.id,
          display_name: user.email ?? "Owner",
          role: "owner",
        });
      }
      toast.success("Saved");
      await refreshRestaurant();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Restaurant profile and bill defaults.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{restaurant ? "Restaurant profile" : "Set up your restaurant"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={save}>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>URL slug</Label>
                <Input placeholder="auto-generated if empty" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
              </div>
              <div>
                <Label>Tax %</Label>
                <Input type="number" step="0.1" min={0} value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Invoice prefix</Label>
              <Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
