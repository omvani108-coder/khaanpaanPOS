import { Link } from "react-router-dom";
import { ClipboardList, Clock, CheckCircle2, IndianRupee, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { formatINR } from "@/lib/utils";
import { displayStatus } from "@/lib/orderStatus";
import { OrderCard } from "@/components/orders/OrderCard";

export default function DashboardPage() {
  const { restaurant } = useAuth();
  const { data: orders = [] } = useOrders(restaurant?.id);

  const pending = orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
  const delayed = orders.filter((o) => displayStatus(o) === "delayed");
  const completed = orders.filter((o) => o.status === "completed");
  const revenue = completed.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6">
      {/* ── Page heading ── */}
      <div className="relative pb-3">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Today's Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Live overview of kitchen, tables, and revenue.
        </p>
        {/* Gold chain underline */}
        <div className="absolute bottom-0 left-0 w-48 h-[10px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23C9920A' opacity='0.7'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23C9920A' stroke-width='0.8' stroke-dasharray='2%2C1' opacity='0.7'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23C9920A' opacity='0.7'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23C9920A' opacity='0.7'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23C9920A' opacity='0.7'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat-x",
            backgroundSize: "40px 10px",
          }}
        />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Active orders" value={pending.length}
          accent="bg-blue-50 text-blue-900" iconColor="hsl(217 91% 60%)" />
        <Stat icon={<AlertTriangle className="h-5 w-5" />} label="Delayed" value={delayed.length}
          accent="bg-red-50 text-red-900" iconColor="hsl(0 72% 51%)" />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={completed.length}
          accent="bg-emerald-50 text-emerald-900" iconColor="hsl(142 71% 45%)" />
        <Stat icon={<IndianRupee className="h-5 w-5" />} label="Revenue" value={formatINR(revenue)}
          accent="bg-amber-50 text-amber-900" iconColor="hsl(43 74% 48%)" />
      </div>

      {/* ── Active orders ── */}
      <div>
        <SectionHeading title="Active Orders">
          <Link to="/orders" className="text-sm font-medium hover:underline" style={{ color: "hsl(18 85% 42%)" }}>
            View all →
          </Link>
        </SectionHeading>

        {pending.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-9 w-9" style={{ color: "hsl(43 74% 48%)" }} />}
            title="No active orders"
            description="Orders from QR scans and delivery partners will appear here."
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
            {pending.slice(0, 6).map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon, label, value, iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 pt-4 flex items-center gap-3">
        <div
          className="rounded-lg p-2.5 flex-shrink-0"
          style={{
            background: `${iconColor}18`,
            border: `1px solid ${iconColor}40`,
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Decorative section heading with side ornament */
export function SectionHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <div className="flex items-center gap-2">
        {/* Left diamond ornament */}
        <span style={{ color: "hsl(43 74% 48%)", fontSize: "10px" }}>◆</span>
        <h2 className="text-lg font-semibold" style={{ fontFamily: "Georgia, serif" }}>{title}</h2>
        <span style={{ color: "hsl(43 74% 48%)", fontSize: "10px" }}>◆</span>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      className="rounded-lg border border-dashed p-10 text-center lotus-bg mt-3"
      style={{ borderColor: "hsl(43 74% 70%)" }}
    >
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-medium" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
