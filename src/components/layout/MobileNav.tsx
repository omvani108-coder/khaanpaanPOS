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
import { ThemeToggle } from "@/components/ThemeToggle";

// Primary 4 items + "More" — bottom bar
const primary = [
  { to: "/dashboard", label: "Home",   icon: LayoutDashboard },
  { to: "/orders",    label: "Orders", icon: ClipboardList },
  { to: "/menu",      label: "Menu",   icon: BookOpen },
  { to: "/floor",     label: "Floor",  icon: LayoutGrid },
];

// Everything else — drawer grouped
const more = [
  { group: "Daily", items: [
    { to: "/bills",     label: "Bills",    icon: Receipt },
    { to: "/earnings",  label: "Earnings", icon: TrendingUp },
  ]},
  { group: "Restaurant", items: [
    { to: "/tables",    label: "Tables & QR", icon: QrCode },
    { to: "/customers", label: "Customers",   icon: Users },
    { to: "/delivery",  label: "Delivery",    icon: Truck },
  ]},
  { group: "Staff", items: [
    { to: "/kitchen",   label: "Kitchen KDS", icon: UtensilsCrossed },
    { to: "/captain",   label: "Captain App", icon: UserCircle2 },
    { to: "/shift",     label: "Shift",       icon: IndianRupee },
  ]},
  { group: "AI & Settings", items: [
    { to: "/schedule",  label: "AI Schedule", icon: BrainCircuit },
    { to: "/settings",  label: "Settings",    icon: Settings },
  ]},
];

export function MobileNav() {
  const { newOrderCount, clearNewOrders } = useNewOrders();
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex no-print bg-card border-t border-border">
        {primary.map(({ to, label, icon: Icon }) => {
          const showDot = newOrderCount > 0 && (to === "/dashboard" || to === "/orders");
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (to === "/dashboard" || to === "/orders") clearNewOrders(); }}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-gold-600" : "text-slate-400 hover:text-slate-600"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn("relative rounded-xl p-1.5 transition-all", isActive ? "bg-gold-500/10" : "")}>
                    <Icon className="h-5 w-5" />
                    {showDot && (
                      <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_3px_rgba(74,222,128,0.9)] animate-pulse border border-white" />
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
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
        >
          <div className="rounded-xl p-1.5">
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
