import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { displayStatus, statusClass, statusLabel } from "@/lib/orderStatus";
import { elapsedLabel, formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { RestaurantTable } from "@/types/db";
import type { OrderWithItems } from "@/types/db";
import { Users, Clock, ChefHat } from "lucide-react";

export default function FloorPlanPage() {
  const { restaurant } = useAuth();
  const navigate = useNavigate();
  const rid = restaurant?.id;

  const tablesQ = useQuery<RestaurantTable[]>({
    queryKey: ["tables", rid],
    enabled: Boolean(rid) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", rid!)
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      return (data ?? []) as RestaurantTable[];
    },
  });

  const { data: orders = [] } = useOrders(rid);

  // Map table_id → active orders (pending/preparing/ready/served)
  const activeByTable = useMemo(() => {
    const map = new Map<string, OrderWithItems[]>();
    for (const o of orders) {
      if (!o.table_id) continue;
      if (["completed", "cancelled"].includes(o.status)) continue;
      if (!map.has(o.table_id)) map.set(o.table_id, []);
      map.get(o.table_id)!.push(o);
    }
    return map;
  }, [orders]);

  const tables = tablesQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Floor plan</h1>
          <p className="text-muted-foreground text-sm">Live status of every table. Click a table to view its orders.</p>
        </div>
        <Legend />
      </div>

      {tables.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No tables set up. Go to <strong>Tables &amp; QR</strong> to add some.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tables.map((t) => {
            const tableOrders = activeByTable.get(t.id) ?? [];
            const topOrder = tableOrders[0] ?? null;
            return (
              <TableTile
                key={t.id}
                table={t}
                orders={tableOrders}
                topOrder={topOrder}
                onClick={() => topOrder && navigate(`/orders`)}
              />
            );
          })}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <StatPill
          label="Occupied"
          value={tables.filter((t) => activeByTable.has(t.id)).length}
          of={tables.length}
          color="bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20"
        />
        <StatPill
          label="Free"
          value={tables.filter((t) => !activeByTable.has(t.id)).length}
          of={tables.length}
          color="bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20"
        />
        <StatPill
          label="Active orders"
          value={orders.filter((o) => !["completed", "cancelled"].includes(o.status)).length}
          color="bg-blue-400/10 text-blue-400 ring-1 ring-blue-400/20"
        />
      </div>
    </div>
  );
}

function TableTile({
  table,
  orders,
  topOrder,
  onClick,
}: {
  table: RestaurantTable;
  orders: OrderWithItems[];
  topOrder: OrderWithItems | null;
  onClick: () => void;
}) {
  const isOccupied = orders.length > 0;
  const ds = topOrder ? displayStatus(topOrder) : null;

  return (
    <button
      onClick={isOccupied ? onClick : undefined}
      className={cn(
        "relative rounded-xl border-2 p-3 text-left transition select-none",
        isOccupied
          ? "border-primary/50 bg-primary/5 hover:bg-primary/10 cursor-pointer shadow-sm"
          : "border-border bg-card cursor-default opacity-70"
      )}
    >
      {/* Table label */}
      <div className="font-bold text-lg leading-none">{table.label}</div>

      {/* Seats */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Users className="h-3 w-3" />
        {table.seats}
      </div>

      {/* Status when occupied */}
      {topOrder && ds && (
        <div className="mt-2 space-y-1.5">
          <Badge className={cn("text-[10px] px-1.5 py-0", statusClass[ds])}>
            {statusLabel[ds]}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {elapsedLabel(topOrder.placed_at)}
          </div>
          <div className="text-xs font-semibold">{formatINR(topOrder.total)}</div>
          {orders.length > 1 && (
            <div className="text-[10px] text-muted-foreground">+{orders.length - 1} more order{orders.length > 2 ? "s" : ""}</div>
          )}
        </div>
      )}

      {/* Free indicator */}
      {!isOccupied && (
        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400/70">
          <ChefHat className="h-3 w-3" />
          Free
        </div>
      )}

      {/* Order count badge */}
      {orders.length > 0 && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {orders.length}
        </div>
      )}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground no-print">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded border-2 border-primary/50 bg-primary/5 inline-block" />
        Occupied
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded border-2 border-border bg-card inline-block" />
        Free
      </span>
    </div>
  );
}

function StatPill({
  label,
  value,
  of,
  color,
}: {
  label: string;
  value: number;
  of?: number;
  color: string;
}) {
  return (
    <div className={cn("rounded-lg px-3 py-2 text-sm", color)}>
      <div className="font-bold text-xl leading-none">
        {value}
        {of !== undefined && <span className="text-sm font-normal opacity-60"> / {of}</span>}
      </div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  );
}
