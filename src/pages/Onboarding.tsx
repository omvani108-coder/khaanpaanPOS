import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, ChevronLeft, CheckCircle2, BookOpen, QrCode, ClipboardList, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { randomToken } from "@/lib/utils";

const STEPS = ["Restaurant Info", "Tables", "All Set!"] as const;

export default function OnboardingPage() {
  const { user, refreshRestaurant, restaurant } = useAuth();
  const navigate = useNavigate();

  // If they somehow already have a restaurant, skip to done
  const [step, setStep] = useState<number>(restaurant ? 2 : 0);
  const [createdRestaurantId, setCreatedRestaurantId] = useState<string | null>(restaurant?.id ?? null);
  const [busy, setBusy] = useState(false);

  /* ── Step 1 state ── */
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    gstin: "",
    tax_percent: "5",
    invoice_prefix: "INV",
  });

  /* ── Step 2 state ── */
  const [tableCount, setTableCount] = useState("5");

  // ── Step 1 submit ──────────────────────────────────────────────────
  async function saveRestaurant(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const slug = form.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { data, error } = await supabase
        .from("restaurants")
        .insert({
          name: form.name.trim(),
          slug: slug || "my-restaurant",
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          gstin: form.gstin.trim() || null,
          tax_percent: Number(form.tax_percent) || 5,
          invoice_prefix: form.invoice_prefix.trim() || "INV",
          owner_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Create owner staff row
      await supabase.from("staff").insert({
        restaurant_id: data.id,
        user_id: user.id,
        display_name: user.email ?? "Owner",
        role: "owner",
      });

      setCreatedRestaurantId(data.id);
      // Don't block the flow if refresh fails — the restaurant is already
      // saved in DB; AuthContext will pick it up on the next render/signal.
      try { await refreshRestaurant(); }
      catch (refreshErr) { console.warn("[Onboarding] refreshRestaurant failed, continuing:", refreshErr); }
      setStep(1);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2 submit ──────────────────────────────────────────────────
  async function createTables(e: React.FormEvent) {
    e.preventDefault();
    const rid = createdRestaurantId;
    if (!rid) { setStep(2); return; }
    const count = Math.min(Math.max(Number(tableCount) || 1, 1), 50);
    setBusy(true);
    try {
      const rows = Array.from({ length: count }, (_, i) => ({
        restaurant_id: rid,
        label: `Table ${i + 1}`,
        seats: 4,
        qr_token: randomToken(12),
      }));
      const { error } = await supabase.from("restaurant_tables").insert(rows);
      if (error) throw error;
      setStep(2);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function skipTables() { setStep(2); }

  function finish() { navigate("/dashboard", { replace: true }); }

  // ── Progress bar ──────────────────────────────────────────────────
  const progress = step === 0 ? 10 : step === 1 ? 55 : 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(196,148,24,0.07) 0%, transparent 70%)" }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="खान-पान" className="h-10 w-10 rounded-full object-cover ring-2 ring-gold-400/30" />
          <span className="font-bold text-gold-600 text-base">खान-पान POS</span>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-gold-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`hidden sm:block text-xs font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
            </div>
          ))}
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-10 h-1 bg-muted">
        <div
          className="h-full bg-gold-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* ── STEP 0: Restaurant Info ── */}
          {step === 0 && (
            <form onSubmit={saveRestaurant} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome! Let's set up your restaurant 🍽️</h1>
                <p className="text-muted-foreground text-sm mt-1">This takes under 2 minutes. You can edit everything later.</p>
              </div>

              <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                  <Label>Restaurant Name <span className="text-destructive">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. Sharma Dhaba"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>GSTIN (optional)</Label>
                    <Input
                      placeholder="22AAAAA0000A1Z5"
                      value={form.gstin}
                      onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Textarea
                    rows={2}
                    placeholder="123, MG Road, Bengaluru"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tax / GST %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.tax_percent}
                      onChange={(e) => setForm({ ...form, tax_percent: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Invoice Prefix</Label>
                    <Input
                      placeholder="INV"
                      value={form.invoice_prefix}
                      onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Saving…" : <>Continue <ChevronRight className="ml-1 h-4 w-4" /></>}
              </Button>
            </form>
          )}

          {/* ── STEP 1: Tables ── */}
          {step === 1 && (
            <form onSubmit={createTables} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">How many tables do you have?</h1>
                <p className="text-muted-foreground text-sm mt-1">We'll create them instantly. You can rename, add or remove tables later.</p>
              </div>

              <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5 shadow-sm">
                <div>
                  <Label>Number of tables</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={tableCount}
                    onChange={(e) => setTableCount(e.target.value)}
                    className="mt-1 text-2xl font-bold h-14 text-center"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    This will create <span className="font-semibold text-foreground">Table 1 → Table {tableCount || "…"}</span>. Max 50.
                  </p>
                </div>

                {/* Preview pills */}
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(Number(tableCount) || 0, 12) }, (_, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-gold-400/10 text-gold-700 text-xs font-medium border border-gold-400/20">
                      Table {i + 1}
                    </span>
                  ))}
                  {(Number(tableCount) || 0) > 12 && (
                    <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs">
                      +{Number(tableCount) - 12} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep(0)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button type="submit" size="lg" className="flex-1" disabled={busy}>
                  {busy ? "Creating…" : <>Add Tables <ChevronRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </div>
              <button
                type="button"
                onClick={skipTables}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Skip — I'll add tables manually later
              </button>
            </form>
          )}

          {/* ── STEP 2: Done ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 ring-4 ring-green-500/20">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">You're all set! 🎉</h1>
                <p className="text-muted-foreground text-sm mt-1">Your restaurant is live on खान-पान POS.</p>
              </div>

              {/* Next steps checklist */}
              <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Recommended next steps</p>
                {[
                  {
                    icon: <BookOpen className="h-4 w-4 text-gold-600" />,
                    title: "Add your menu items",
                    desc: "Categories, prices, photos — customers see this on QR scan.",
                    href: "/menu",
                  },
                  {
                    icon: <QrCode className="h-4 w-4 text-blue-600" />,
                    title: "Print QR codes for your tables",
                    desc: "Each table gets a unique QR. Customers scan to order.",
                    href: "/tables",
                  },
                  {
                    icon: <ClipboardList className="h-4 w-4 text-emerald-600" />,
                    title: "Place a test order",
                    desc: "Scan your own QR code to see the customer flow.",
                    href: "/orders",
                  },
                  {
                    icon: <Sparkles className="h-4 w-4 text-purple-600" />,
                    title: "Try BhojanBot AI",
                    desc: "Ask it to update your menu or check today's analytics.",
                    href: "/schedule",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-gold-600 transition-colors">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40 self-center flex-shrink-0" />
                  </Link>
                ))}
              </div>

              <Button size="lg" className="w-full" onClick={finish}>
                Go to Dashboard →
              </Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
