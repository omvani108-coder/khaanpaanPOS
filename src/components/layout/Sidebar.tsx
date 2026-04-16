import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BookOpen, QrCode, Receipt, Truck, Settings, LogOut, ChefHat, LayoutGrid, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/floor", label: "Floor Plan", icon: LayoutGrid },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/menu", label: "Menu", icon: BookOpen },
  { to: "/tables", label: "Tables & QR", icon: QrCode },
  { to: "/delivery", label: "Delivery Orders", icon: Truck },
  { to: "/bills", label: "Bills", icon: Receipt },
  { to: "/captain", label: "Captain App", icon: UserCircle2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { restaurant, signOut, user } = useAuth();

  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-card no-print">
      <div className="flex h-16 items-center gap-2 px-5 border-b">
        <ChefHat className="h-6 w-6 text-primary" />
        <div>
          <div className="font-bold tracking-tight">KHAANPAAN</div>
          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">खानपान</div>
        </div>
      </div>

      <div className="px-5 py-3 border-b">
        <div className="text-xs text-muted-foreground">Restaurant</div>
        <div className="font-medium truncate">{restaurant?.name ?? "Not set up"}</div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="text-xs text-muted-foreground truncate mb-2">{user?.email ?? "Guest"}</div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/70 hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
