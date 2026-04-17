import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, signIn, signUp, demoMode } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) setErr(error);
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      {/* Subtle gold radial glow from top */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(196,148,24,0.07) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          {/* Brand mark: gold cloche + red bowl */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gold-500 flex items-center justify-center shadow-gold-glow">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shadow-md">
              <span className="text-white text-lg leading-none">♨</span>
            </div>
          </div>
          <div className="font-bold text-3xl tracking-tight text-gold-600">खान-पान</div>
          <div className="text-sm text-muted-foreground mt-0.5">AI-Powered Restaurant Management</div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-card-lg border border-border/60 p-7">
          <h2 className="text-base font-semibold text-foreground mb-5">
            {mode === "signin" ? "Sign in to your account" : "Create a new account"}
          </h2>

          {demoMode && (
            <div className="mb-5 rounded-xl bg-gold-400/8 border border-gold-400/20 px-4 py-3 text-xs text-gold-600">
              Supabase not configured — add credentials in{" "}
              <code className="rounded bg-gold-400/15 px-1 font-mono">.env.local</code> to enable login.
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@restaurant.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={busy || demoMode}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-border/50 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm text-gold-600 hover:text-gold-500 font-medium transition-colors"
            >
              {mode === "signin"
                ? "New restaurant? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          खान-पान POS · Made for Indian restaurants · Dine-in · Delivery · QR Orders
        </p>
      </div>
    </div>
  );
}
