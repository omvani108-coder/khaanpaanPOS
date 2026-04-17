import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BookOpen, UserCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home",     icon: LayoutDashboard },
  { to: "/orders",    label: "Orders",   icon: ClipboardList },
  { to: "/menu",      label: "Menu",     icon: BookOpen },
  { to: "/customers", label: "Customers",icon: Users },
  { to: "/captain",   label: "Captain",  icon: UserCircle2 },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex no-print bg-white border-t border-border">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              isActive ? "text-gold-600" : "text-slate-400 hover:text-slate-600"
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn("rounded-xl p-1.5 transition-all", isActive ? "bg-gold-500/10" : "")}>
                <Icon className="h-5 w-5" />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
