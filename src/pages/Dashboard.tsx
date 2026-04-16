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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Today's dashboard</h1>
        <p className="text-muted-foreground text-sm">Live overview of kitchen, tables, and revenue.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Active orders" value={pending.length} accent="bg-blue-50 text-blue-900" />
        <Stat icon={<AlertTriangle className="h-5 w-5" />} label="Delayed" value={delayed.length} accent="bg-red-50 text-red-900" />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={completed.length} accent="bg-emerald-50 text-emerald-900" />
        <Stat icon={<IndianRupee className="h-5 w-5" />} label="Revenue" value={formatINR(revenue)} accent="bg-amber-50 text-amber-900" />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold">Active orders</h2>
          <Link to="/orders" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        {pending.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-8 w-8 text-muted-foreground" />}
            title="No active orders"
            description="Orders from QR scans and delivery partners will appear here."
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.slice(0, 6).map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <Card>
      <CardContent className="p-4 pt-4 flex items-center gap-3">
        <div className={`rounded-md p-2 ${accent}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
