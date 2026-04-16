import { NavLink } from "react-router-dom";
import { LayoutGrid, ClipboardList, BookOpen, UserCircle2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/floor", label: "Floor", icon: LayoutGrid },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/menu", label: "Menu", icon: BookOpen },
  { to: "/captain", label: "Captain", icon: UserCircle2 },
  { to: "/bills", label: "Bills", icon: Receipt },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t flex no-print">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px]",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
