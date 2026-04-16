import { NavLink } from "react-router-dom";
import { LayoutGrid, ClipboardList, BookOpen, UserCircle2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/floor",   label: "Floor",   icon: LayoutGrid },
  { to: "/orders",  label: "Orders",  icon: ClipboardList },
  { to: "/menu",    label: "Menu",    icon: BookOpen },
  { to: "/captain", label: "Captain", icon: UserCircle2 },
  { to: "/bills",   label: "Bills",   icon: Receipt },
];

export function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex no-print"
      style={{
        background: "linear-gradient(180deg, hsl(0 65% 20%) 0%, hsl(0 65% 16%) 100%)",
        borderTop: "2px solid hsl(43 74% 42%)",
        boxShadow: "0 -2px 12px hsl(0 65% 10% / 0.4)",
      }}
    >
      {/* Gold chain strip at very top */}
      <div
        className="absolute top-0 left-0 right-0 h-[7px] -translate-y-full pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='7'%3E%3Cpath d='M3 3.5L7 1L11 3.5L7 6Z' fill='%23C9920A' opacity='0.7'/%3E%3Cline x1='11' y1='3.5' x2='13' y2='3.5' stroke='%23C9920A' stroke-width='0.6' opacity='0.7'/%3E%3Cpath d='M13 3.5L17 1L21 3.5L17 6Z' fill='%23C9920A' opacity='0.7'/%3E%3Ccircle cx='0' cy='3.5' r='1' fill='%23C9920A' opacity='0.7'/%3E%3Ccircle cx='24' cy='3.5' r='1' fill='%23C9920A' opacity='0.7'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat-x",
          backgroundSize: "24px 7px",
        }}
      />
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              isActive
                ? "text-[hsl(43_74%_68%)]"
                : "text-[hsl(38_30%_55%)] hover:text-[hsl(43_74%_60%)]"
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  "rounded-full p-1 transition-all",
                  isActive && "bg-[hsl(43_74%_48%/0.15)]"
                )}
              >
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
