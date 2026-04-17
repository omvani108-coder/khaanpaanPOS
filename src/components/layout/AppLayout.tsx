import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { DemoBanner } from "./DemoBanner";
import { BhojanBot } from "@/components/bhojanbot/BhojanBot";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";

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
    const chan = supabase
      .channel(`orders-global-${rid}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${rid}` },
        () => void qc.invalidateQueries({ queryKey: ["orders", rid] })
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => void qc.invalidateQueries({ queryKey: ["orders", rid] })
      )
      .subscribe();

    return () => { void supabase.removeChannel(chan); };
  }, [rid, qc]);

  return null;
}

export function AppLayout() {
  const { demoMode } = useAuth();
  return (
    <div className="flex min-h-screen bg-background">
      <GlobalOrderWatcher />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {demoMode && <DemoBanner />}
        {/* Top bar */}
        <header className="h-12 flex items-center justify-end px-4 md:px-8 border-b border-border/50 bg-card/60 backdrop-blur-sm flex-shrink-0">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl py-6 px-4 md:px-8">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
      {/* BhojanBot — floating AI assistant, visible across all staff pages */}
      <BhojanBot />
    </div>
  );
}
