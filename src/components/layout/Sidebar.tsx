import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, BookOpen, QrCode, Receipt,
  Truck, Settings, LogOut, LayoutGrid, UserCircle2, BrainCircuit,
  UtensilsCrossed, IndianRupee, Users, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNewOrders } from "@/contexts/NewOrderContext";

const navGroups = [
  {
    label: "Daily",
    items: [
      { to: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
      { to: "/orders",    label: "Orders",     icon: ClipboardList },
      { to: "/floor",     label: "Floor Plan", icon: LayoutGrid },
      { to: "/bills",     label: "Bills",      icon: Receipt },
      { to: "/earnings",  label: "Earnings",   icon: TrendingUp },
    ],
  },
  {
    label: "Restaurant",
    items: [
      { to: "/menu",      label: "Menu",        icon: BookOpen },
      { to: "/tables",    label: "Tables & QR", icon: QrCode },
      { to: "/customers", label: "Customers",   icon: Users },
      { to: "/delivery",  label: "Delivery",    icon: Truck },
    ],
  },
  {
    label: "Staff",
    items: [
      { to: "/kitchen",  label: "Kitchen KDS", icon: UtensilsCrossed },
      { to: "/captain",  label: "Captain App", icon: UserCircle2 },
      { to: "/shift",    label: "Shift",       icon: IndianRupee },
    ],
  },
  {
    label: "AI",
    items: [
      { to: "/schedule", label: "AI Schedule", icon: BrainCircuit },
    ],
  },
];

export function Sidebar() {
  const { restaurant, signOut, user } = useAuth();
  const { newOrderCount, clearNewOrders } = useNewOrders();

  return (
    <aside className="hidden md:flex w-56 flex-col no-print bg-white border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-center px-3 h-16 border-b border-border flex-shrink-0">
        <img src="/logo.png" alt="खान-पान POS" className="h-12 w-auto object-contain" />
      </div>

      {/* Restaurant chip */}
      <div className="mx-2.5 mt-2.5 mb-1 px-3 py-2 rounded-xl bg-muted border border-border">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Restaurant</div>
        <div className="text-xs font-semibold text-foreground/80 truncate mt-0.5">
          {restaurant?.name ?? "Not set up yet"}
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
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
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
              isActive ? "bg-gold-500/10 text-gold-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={cn("h-3.5 w-3.5 flex-shrink-0", isActive ? "text-gold-600" : "opacity-50 group-hover:opacity-80")} />
              Settings
            </>
          )}
        </NavLink>
        <div className="text-[10px] text-muted-foreground truncate px-2 mb-1">{user?.email ?? "Guest"}</div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
