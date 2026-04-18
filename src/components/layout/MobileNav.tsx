import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, BookOpen, LayoutGrid, Menu as MenuIcon,
  QrCode, Receipt, TrendingUp, Truck, UtensilsCrossed, UserCircle2,
  IndianRupee, BrainCircuit, Users, Settings, LogOut, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNewOrders } from "@/contexts/NewOrderContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import t from "@/lib/translations";

export function MobileNav() {
  const { newOrderCount, clearNewOrders } = useNewOrders();
  const { signOut, user } = useAuth();
  const { l } = useLang();
  const [open, setOpen] = useState(false);

  const primary = [
    { to: "/dashboard", label: l(t.nav.home),      icon: LayoutDashboard },
    { to: "/orders",    label: l(t.nav.orders),    icon: ClipboardList },
    { to: "/menu",      label: l(t.nav.menu),      icon: BookOpen },
    { to: "/floor",     label: l(t.nav.floor),     icon: LayoutGrid },
  ];

  const more = [
    { group: l(t.nav.daily), items: [
      { to: "/bills",    label: l(t.nav.bills),    icon: Receipt },
      { to: "/earnings", label: l(t.nav.earnings), icon: TrendingUp },
    ]},
    { group: l(t.nav.restaurant), items: [
      { to: "/tables",    label: l(t.nav.tablesQr),  icon: QrCode },
      { to: "/customers", label: l(t.nav.customers), icon: Users },
      { to: "/delivery",  label: l(t.nav.delivery),  icon: Truck },
    ]},
    { group: l(t.nav.staff), items: [
      { to: "/kitchen",  label: l(t.nav.kitchen), icon: UtensilsCrossed },
      { to: "/captain",  label: l(t.nav.captain), icon: UserCircle2 },
      { to: "/shift",    label: l(t.nav.shift),   icon: IndianRupee },
    ]},
    { group: `${l(t.nav.ai)} & ${l(t.nav.settings)}`, items: [
      { to: "/schedule", label: l(t.nav.schedule), icon: BrainCircuit },
      { to: "/settings", label: l(t.nav.settings), icon: Settings },
    ]},
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex no-print bg-card/95 backdrop-blur-md border-t border-border/60 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] safe-area-bottom">
        {primary.map(({ to, label, icon: Icon }) => {
          const showDot = newOrderCount > 0 && (to === "/dashboard" || to === "/orders");
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (to === "/dashboard" || to === "/orders") clearNewOrders(); }}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-semibold transition-all active:scale-95",
                  isActive ? "text-gold-600" : "text-slate-400"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "relative rounded-2xl p-2 transition-all duration-200",
                    isActive ? "bg-gold-500/12 shadow-[0_2px_8px_rgba(196,148,24,0.2)]" : ""
                  )}>
                    <Icon className={cn("h-5 w-5 transition-transform", isActive ? "scale-110" : "")} />
                    {showDot && (
                      <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_3px_rgba(74,222,128,0.9)] animate-pulse border-2 border-card" />
                    )}
                  </div>
                  {label}
                </>
              )}
            </NavLink>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-semibold text-slate-400 transition-all active:scale-95"
        >
          <div className="rounded-2xl p-2">
            <MenuIcon className="h-5 w-5" />
          </div>
          More
        </button>
      </nav>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 no-print">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-gold-400/30" />
                <div>
                  <div className="font-bold text-gold-600 text-sm leading-none">खान-पान POS</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{user?.email ?? ""}</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {more.map((grp) => (
                <div key={grp.group}>
                  <div className="px-2 mb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                    {grp.group}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {grp.items.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                            isActive
                              ? "bg-gold-500/10 text-gold-600"
                              : "bg-muted/40 text-slate-700 hover:bg-muted"
                          )
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                        <span className="truncate">{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sign out + theme toggle */}
            <div className="border-t border-border/60 p-4 pb-6 flex gap-2">
              <button
                onClick={() => { setOpen(false); void signOut(); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
              <ThemeToggle className="rounded-xl px-4 py-3 text-sm" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
