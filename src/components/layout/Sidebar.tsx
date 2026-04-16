import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, BookOpen, QrCode, Receipt,
  Truck, Settings, LogOut, LayoutGrid, UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/floor",     label: "Floor Plan", icon: LayoutGrid },
  { to: "/orders",    label: "Orders",     icon: ClipboardList },
  { to: "/menu",      label: "Menu",       icon: BookOpen },
  { to: "/tables",    label: "Tables & QR",icon: QrCode },
  { to: "/delivery",  label: "Delivery",   icon: Truck },
  { to: "/bills",     label: "Bills",      icon: Receipt },
  { to: "/captain",   label: "Captain App",icon: UserCircle2 },
  { to: "/settings",  label: "Settings",   icon: Settings },
];

export function Sidebar() {
  const { restaurant, signOut, user } = useAuth();

  return (
    <aside className="hidden md:flex w-64 flex-col no-print"
      style={{
        background: "linear-gradient(180deg, hsl(0 65% 22%) 0%, hsl(0 60% 18%) 100%)",
        borderRight: "3px solid hsl(43 74% 48%)",
      }}
    >
      {/* ── Logo band ── */}
      <div className="relative overflow-hidden px-5 py-5 border-b border-[hsl(43_74%_35%)]">
        {/* Ivory chain border at top */}
        <div className="absolute top-0 left-0 right-0 h-[10px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23F5E6C8' opacity='0.6'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23F5E6C8' stroke-width='0.8' stroke-dasharray='2%2C1' opacity='0.6'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23F5E6C8' opacity='0.6'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.6'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat-x",
            backgroundSize: "40px 10px",
          }}
        />
        {/* Paisley watermark top-right */}
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cg opacity='0.2' fill='%23F5E6C8'%3E%3Cellipse cx='44' cy='20' rx='10' ry='18' transform='rotate(30 44 20)'/%3E%3Ccircle cx='40' cy='12' r='4'/%3E%3Cpath d='M52 8 Q60 4 64 8 Q62 16 56 18 Q50 14 52 8Z'/%3E%3Ccircle cx='56' cy='6' r='2'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="flex items-center gap-3 mt-2">
          {/* Lotus icon stamp */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(43 74% 48%)", boxShadow: "0 0 0 2px hsl(43 74% 70%), 0 0 0 4px hsl(0 65% 22%)" }}>
            <span className="text-[18px] leading-none">🪷</span>
          </div>
          <div>
            <div className="font-bold text-lg tracking-widest"
              style={{ color: "hsl(43 74% 82%)", fontFamily: "Georgia, serif", letterSpacing: "0.15em" }}>
              KHAANPAAN
            </div>
            <div className="text-[11px] tracking-[0.2em] opacity-70" style={{ color: "hsl(38 60% 80%)" }}>
              खानपान
            </div>
          </div>
        </div>
        {/* Ivory chain border at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[10px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23F5E6C8' opacity='0.6'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23F5E6C8' stroke-width='0.8' stroke-dasharray='2%2C1' opacity='0.6'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23F5E6C8' opacity='0.6'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.6'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23F5E6C8' opacity='0.6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat-x",
            backgroundSize: "40px 10px",
          }}
        />
      </div>

      {/* ── Restaurant name pill ── */}
      <div className="px-4 py-3 mx-3 my-3 rounded text-center"
        style={{
          background: "hsl(0 65% 14%)",
          border: "1px solid hsl(43 74% 38%)",
        }}
      >
        <div className="text-[10px] uppercase tracking-widest opacity-60" style={{ color: "hsl(43 74% 80%)" }}>
          Restaurant
        </div>
        <div className="font-semibold text-sm mt-0.5 truncate" style={{ color: "hsl(43 74% 88%)" }}>
          {restaurant?.name ?? "Not set up"}
        </div>
      </div>

      {/* ── Nav items ── */}
      <nav className="flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-[hsl(20_30%_12%)]"
                  : "text-[hsl(38_40%_78%)] hover:text-[hsl(43_74%_88%)] hover:bg-[hsl(0_60%_28%)]"
              )
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: "linear-gradient(90deg, hsl(43 74% 48%), hsl(43 74% 58%))",
                    boxShadow: "inset 0 1px 0 hsl(43 74% 70%), inset 0 -1px 0 hsl(43 74% 35%)",
                  }
                : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-[hsl(0_65%_22%)]" : "opacity-70 group-hover:opacity-100")} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto text-[hsl(0_65%_22%)] opacity-50 text-xs">◆</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-[hsl(43_74%_28%)] px-4 py-3">
        {/* Chain strip above footer */}
        <div className="mb-2 h-[7px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='7'%3E%3Cpath d='M3 3.5L7 1L11 3.5L7 6Z' fill='%23F5E6C8' opacity='0.3'/%3E%3Cline x1='11' y1='3.5' x2='13' y2='3.5' stroke='%23F5E6C8' stroke-width='0.6' opacity='0.3'/%3E%3Cpath d='M13 3.5L17 1L21 3.5L17 6Z' fill='%23F5E6C8' opacity='0.3'/%3E%3Ccircle cx='0' cy='3.5' r='1' fill='%23F5E6C8' opacity='0.3'/%3E%3Ccircle cx='24' cy='3.5' r='1' fill='%23F5E6C8' opacity='0.3'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat-x",
            backgroundSize: "24px 7px",
          }}
        />
        <div className="text-[11px] truncate opacity-50 mb-1.5" style={{ color: "hsl(38 40% 78%)" }}>
          {user?.email ?? "Guest"}
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm transition hover:bg-[hsl(0_60%_28%)]"
          style={{ color: "hsl(38 40% 72%)" }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
