import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BookOpen, UserCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNewOrders } from "@/contexts/NewOrderContext";

const items = [
  { to: "/dashboard", label: "Home",     icon: LayoutDashboard },
  { to: "/orders",    label: "Orders",   icon: ClipboardList },
  { to: "/menu",      label: "Menu",     icon: BookOpen },
  { to: "/customers", label: "Customers",icon: Users },
  { to: "/captain",   label: "Captain",  icon: UserCircle2 },
];

export function MobileNav() {
  const { newOrderCount, clearNewOrders } = useNewOrders();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex no-print bg-white border-t border-border">
      {items.map(({ to, label, icon: Icon }) => {
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
    </nav>
  );
}
