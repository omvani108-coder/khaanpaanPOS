import type { Order, OrderStatus } from "@/types/db";

/** UI-facing statuses. "delayed" is derived from pending/preparing + SLA. */
export type DisplayStatus = OrderStatus | "delayed";

export const statusLabel: Record<DisplayStatus, string> = {
  pending:   "Pending",
  preparing: "Preparing",
  ready:     "Ready",
  served:    "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  delayed:   "Delayed",
};

/** Tailwind classes for status pill — light theme. */
export const statusClass: Record<DisplayStatus, string> = {
  pending:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  preparing: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  ready:     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  served:    "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  completed: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  delayed:   "bg-red-50 text-red-700 ring-1 ring-red-200 animate-pulse",
};

/** Compute whether an order should render as "delayed" based on SLA. */
export function isDelayed(order: Pick<Order, "status" | "placed_at" | "sla_minutes">): boolean {
  if (order.status !== "pending" && order.status !== "preparing") return false;
  const placedMs = new Date(order.placed_at).getTime();
  const ageMin = (Date.now() - placedMs) / 60000;
  return ageMin > order.sla_minutes;
}

export function displayStatus(order: Pick<Order, "status" | "placed_at" | "sla_minutes">): DisplayStatus {
  return isDelayed(order) ? "delayed" : order.status;
}

/** Allowed forward transitions from a given state. */
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending:   ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready:     ["served", "cancelled"],
  served:    ["completed"],
  completed: [],
  cancelled: [],
};
