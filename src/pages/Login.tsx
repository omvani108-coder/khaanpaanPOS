import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

const CHAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23C9920A' opacity='0.7'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23C9920A' stroke-width='0.8' stroke-dasharray='2%2C1' opacity='0.7'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23C9920A' opacity='0.7'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23C9920A' opacity='0.7'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23C9920A' opacity='0.7'/%3E%3C/svg%3E\")";
const CHAIN_IVORY = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23F5E6C8' opacity='0.6'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23F5E6C8' stroke-width='0.8' stroke-dasharray='2%2C1' opacity='0.6'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23F5E6C8' opacity='0.6'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.6'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.6'/%3E%3C/svg%3E\")";

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
    <div
      className="min-h-screen grid place-items-center px-4"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(0 65% 20% / 0.12) 0%, transparent 70%), linear-gradient(160deg, hsl(38 40% 96%) 0%, hsl(38 30% 92%) 100%)",
      }}
    >
      {/* Background buti dots */}
      <div
        className="fixed inset-0 pointer-events-none buti-pattern opacity-50"
        style={{ zIndex: 0 }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* ── Card ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            boxShadow: "0 8px 40px hsl(0 65% 12% / 0.15), 0 0 0 1px hsl(43 74% 48% / 0.25)",
          }}
        >
          {/* Maroon header */}
          <div
            className="relative px-7 py-7 overflow-hidden"
            style={{
              background: "linear-gradient(160deg, hsl(0 65% 22%) 0%, hsl(0 60% 18%) 100%)",
            }}
          >
            {/* Ivory chain top */}
            <div className="absolute top-0 left-0 right-0 h-[10px]"
              style={{ backgroundImage: CHAIN_IVORY, backgroundRepeat: "repeat-x", backgroundSize: "40px 10px" }}
            />
            {/* Paisley watermark */}
            <div className="absolute top-0 right-0 w-24 h-24 opacity-20 pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Cg fill='%23F5E6C8'%3E%3Cellipse cx='66' cy='30' rx='15' ry='27' transform='rotate(30 66 30)'/%3E%3Ccircle cx='60' cy='18' r='6'/%3E%3Cpath d='M78 12 Q90 6 96 12 Q93 24 84 27 Q75 21 78 12Z'/%3E%3Ccircle cx='84' cy='9' r='3'/%3E%3Ccircle cx='93' cy='21' r='2'/%3E%3C/g%3E%3C/svg%3E\")",
                backgroundSize: "96px 96px",
              }}
            />
            <div className="flex items-center gap-4 mt-3">
              {/* Lotus medallion */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  background: "hsl(43 74% 48%)",
                  boxShadow: "0 0 0 2px hsl(43 74% 72%), 0 0 0 4px hsl(0 65% 22%), 0 0 0 6px hsl(43 74% 38%)",
                }}
              >
                🪷
              </div>
              <div>
                <div
                  className="text-3xl font-bold tracking-[0.15em]"
                  style={{ color: "hsl(43 74% 82%)", fontFamily: "Georgia, serif" }}
                >
                  KHAANPAAN
                </div>
                <div className="text-base tracking-[0.2em] opacity-60 mt-0.5" style={{ color: "hsl(38 60% 80%)" }}>
                  खानपान — Restaurant CRM
                </div>
              </div>
            </div>
            {/* Ivory chain bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[10px]"
              style={{ backgroundImage: CHAIN_IVORY, backgroundRepeat: "repeat-x", backgroundSize: "40px 10px" }}
            />
          </div>

          {/* ── Form body ── */}
          <div className="bg-[hsl(38_25%_99%)] px-7 py-6">
            {demoMode && (
              <div className="mb-4 rounded border px-3 py-2.5 text-xs"
                style={{ background: "hsl(43 74% 92%)", borderColor: "hsl(43 74% 70%)", color: "hsl(43 74% 28%)" }}>
                Supabase not configured — add credentials in <code className="rounded px-1 bg-[hsl(43_74%_85%)]">.env.local</code> to enable login.
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={busy || demoMode}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            {/* Gold chain divider */}
            <div className="my-4 h-[10px]"
              style={{ backgroundImage: CHAIN, backgroundRepeat: "repeat-x", backgroundSize: "40px 10px" }}
            />

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-sm text-center transition hover:underline"
              style={{ color: "hsl(18 85% 42%)" }}
            >
              {mode === "signin"
                ? "New restaurant? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Made for Indian restaurants ◆ Dine-in · Delivery · QR Orders
        </p>
      </div>
    </div>
  );
}
