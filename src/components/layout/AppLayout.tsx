import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { DemoBanner } from "./DemoBanner";
import { BhojanBot } from "@/components/bhojanbot/BhojanBot";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useLang } from "@/contexts/LangContext";
import t from "@/lib/translations";

/**
 * Owns the ONE realtime channel for orders.
 * Lives at AppLayout level so it's never unmounted during navigation.
 * All pages read from the TanStack Query cache this keeps fresh.
 */
function GlobalOrderWatcher() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const rid = restaurant?.id;

  useEffect(() => {
    if (!rid || !supabaseConfigured) return;
    let cancelled = false;
    const chan = supabase
      .channel(`orders-global-${rid}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${rid}` },
        () => { if (!cancelled) void qc.invalidateQueries({ queryKey: ["orders", rid] }); }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => { if (!cancelled) void qc.invalidateQueries({ queryKey: ["orders", rid] }); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(chan);
    };
  }, [rid, qc]);

  return null;
}

export function AppLayout() {
  const { demoMode, restaurant } = useAuth();
  const { l } = useLang();

  return (
    <div className="flex min-h-screen bg-background">
      <GlobalOrderWatcher />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {demoMode && <DemoBanner />}

        {/* ── Mobile header (hidden on md+) ─────────────────────────────── */}
        <header className="md:hidden flex items-center gap-3 px-4 h-16 border-b border-border/60 bg-card flex-shrink-0">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="खान-पान"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/30 flex-shrink-0"
          />
          {/* Restaurant name */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gold-600 text-[13px] leading-tight">खान-पान POS</div>
            <div className="text-[11px] text-muted-foreground truncate leading-tight">
              {restaurant?.name ?? l(t.common.notSetUp)}
            </div>
          </div>
          {/* Compact toggles */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <LangToggle compact />
            <ThemeToggle compact />
          </div>
        </header>

        {/* ── Desktop top bar (hidden on mobile) ────────────────────────── */}
        <header className="hidden md:flex h-12 items-center justify-end gap-2 px-8 border-b border-border/50 bg-card/60 backdrop-blur-sm flex-shrink-0">
          <LangToggle />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl py-4 md:py-6 px-4 md:px-8 pb-24 md:pb-6">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
      <BhojanBot />
    </div>
  );
}
