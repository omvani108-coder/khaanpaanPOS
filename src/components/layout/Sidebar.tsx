import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, BookOpen, QrCode, Receipt,
  Truck, Settings, LogOut, LayoutGrid, UserCircle2, BrainCircuit,
  UtensilsCrossed, IndianRupee, Users, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNewOrders } from "@/contexts/NewOrderContext";
import { useLang } from "@/contexts/LangContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import t from "@/lib/translations";

export function Sidebar() {
  const { restaurant, signOut, user } = useAuth();
  const { newOrderCount, clearNewOrders } = useNewOrders();
  const { l } = useLang();

  const navGroups = [
    {
      label: l(t.nav.daily),
      items: [
        { to: "/dashboard", label: l(t.nav.dashboard), icon: LayoutDashboard },
        { to: "/orders",    label: l(t.nav.orders),    icon: ClipboardList },
        { to: "/floor",     label: l(t.nav.floorPlan), icon: LayoutGrid },
        { to: "/bills",     label: l(t.nav.bills),     icon: Receipt },
        { to: "/earnings",  label: l(t.nav.earnings),  icon: TrendingUp },
      ],
    },
    {
      label: l(t.nav.restaurant),
      items: [
        { to: "/menu",      label: l(t.nav.menu),      icon: BookOpen },
        { to: "/tables",    label: l(t.nav.tablesQr),  icon: QrCode },
        { to: "/customers", label: l(t.nav.customers), icon: Users },
        { to: "/delivery",  label: l(t.nav.delivery),  icon: Truck },
      ],
    },
    {
      label: l(t.nav.staff),
      items: [
        { to: "/kitchen", label: l(t.nav.kitchen),  icon: UtensilsCrossed },
        { to: "/captain", label: l(t.nav.captain),  icon: UserCircle2 },
        { to: "/shift",   label: l(t.nav.shift),    icon: IndianRupee },
      ],
    },
    {
      label: l(t.nav.ai),
      items: [
        { to: "/schedule", label: l(t.nav.schedule), icon: BrainCircuit },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex w-56 flex-col no-print bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-20 border-b border-border flex-shrink-0">
        <img
          src="/logo.png"
          alt="खान-पान POS"
          className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-gold-400/40 shadow-gold-glow"
        />
        <div>
          <div className="font-bold text-gold-600 text-sm tracking-tight leading-none">खान-पान</div>
          <div className="text-[9px] text-muted-foreground tracking-widest mt-0.5">AI · POS</div>
        </div>
      </div>

      {/* Restaurant chip */}
      <div className="mx-2.5 mt-2.5 mb-1 px-3 py-2 rounded-xl bg-muted border border-border">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest">{l(t.common.restaurant)}</div>
        <div className="text-xs font-semibold text-foreground/80 truncate mt-0.5">
          {restaurant?.name ?? l(t.common.notSetUp)}
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2.5 py-2 overflow-y-auto space-y-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2 mb-1 text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => {
                const showDot = newOrderCount > 0 && (to === "/dashboard" || to === "/orders");
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => { if (to === "/dashboard" || to === "/orders") clearNewOrders(); }}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all",
                        isActive
                          ? "bg-gold-500/10 text-gold-600"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/8"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="relative flex-shrink-0">
                          <Icon className={cn("h-3.5 w-3.5", isActive ? "text-gold-600" : "opacity-50 group-hover:opacity-80")} />
                          {showDot && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.8)] animate-pulse" />
                          )}
                        </div>
                        {label}
                        {showDot && (
                          <span className="ml-auto text-[10px] font-bold bg-green-400 text-white rounded-full px-1.5 py-0.5 leading-none shadow-[0_0_6px_rgba(74,222,128,0.8)]">
                            {newOrderCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all mb-1",
              isActive ? "bg-gold-500/10 text-gold-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/8"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={cn("h-3.5 w-3.5 flex-shrink-0", isActive ? "text-gold-600" : "opacity-50 group-hover:opacity-80")} />
              {l(t.nav.settings)}
            </>
          )}
        </NavLink>
        <div className="flex items-center justify-between px-2 mb-1">
          <div className="text-[10px] text-muted-foreground truncate max-w-[110px]">{user?.email ?? "Guest"}</div>
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          {l(t.nav.signOut)}
        </button>
      </div>
    </aside>
  );
}
